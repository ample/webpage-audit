import type { NextApiRequest, NextApiResponse } from 'next';
import { testResultsService } from '@/lib/db/services';

const WPT_BASE = 'https://www.webpagetest.org';

export type Metrics = {
  ttfbMs: number;
  fcpMs: number;
  speedIndexMs: number;
  lcpMs?: number | null;
  requests: number;
  transferredBytes: number;
  onLoadMs: number;
  fullyLoadedMs: number;
};

type Phase = 'queued' | 'running' | 'finished' | 'error';

type NonFinishedPayload = {
  statusCode: number;
  statusText?: string;
  phase: Exclude<Phase, 'finished'>;
  siteUrl?: string;
  siteTitle?: string;
  runAt?: string;
  summaryUrl?: string;
  jsonUrl?: string;
};

type FinishedPayload = {
  statusCode: number;
  statusText?: string;
  phase: 'finished';
  metrics: Metrics;
  siteUrl?: string;
  siteTitle?: string;
  runAt?: string;
  summaryUrl?: string;
  jsonUrl?: string;
};

type Payload = NonFinishedPayload | FinishedPayload;

const STATUS_TEXT_FALLBACK: Record<number, string> = {
  100: 'Test created',
  101: 'Test started',
  102: 'Running',
  200: 'Completed',
  400: 'Bad request',
  404: 'Not found',
  500: 'Server error',
};

async function fetchTitle(url: string, signal: AbortSignal): Promise<string | undefined> {
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CRDS-Audit/1.0)' },
      signal,
    });
    const html = await r.text();
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m?.[1]?.trim();
  } catch {
    return undefined;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Payload | { error: string }>
) {
  const testId = req.query.testId;
  if (!testId || typeof testId !== 'string') {
    return res.status(400).json({ error: 'Missing testId' });
  }

  try {
    // First, check if we have this test cached in our database
    let existingTest = null;
    try {
      existingTest = await testResultsService.findById(testId);
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      // Continue without database cache if DB is unavailable
    }
    if (existingTest && existingTest.phase === 'finished' && existingTest.metrics) {
      // Return cached finished test
      const payload: FinishedPayload = {
        statusCode: 200,
        statusText: 'Completed',
        phase: 'finished',
        metrics: existingTest.metrics as Metrics,
        siteUrl: existingTest.url,
        siteTitle: existingTest.title || undefined,
        runAt: existingTest.runAt.toISOString(),
        summaryUrl: existingTest.summaryUrl || undefined,
        jsonUrl: existingTest.jsonUrl || undefined,
      };
      return res.status(200).json(payload);
    }
    const r = await fetch(
      `${WPT_BASE}/jsonResult.php?test=${encodeURIComponent(testId)}&f=json`,
      {
        headers: {
          Accept: 'application/json',
          'X-WPT-API-KEY': process.env.WPT_API_KEY ?? '',
        },
        cache: 'no-store',
      }
    );

    const json = await r.json();

    const statusCode: number = Number(json?.statusCode ?? 0);
    const statusText: string | undefined =
      typeof json?.statusText === 'string'
        ? json.statusText
        : STATUS_TEXT_FALLBACK[statusCode];

    let phase: Phase = 'queued';
    if (statusCode === 200) phase = 'finished';
    else if (statusCode >= 400) phase = 'error';
    else if (statusCode >= 101) phase = 'running';

    const siteUrl: string | undefined =
      json?.data?.testUrl || json?.data?.url || json?.data?.summaryURL || undefined;

    const wptCompleted: string | undefined =
      typeof json?.data?.completed === 'string'
        ? json.data.completed
        : typeof json?.data?.completed === 'number'
        ? new Date(json.data.completed * 1000).toISOString()
        : undefined;

    const summaryUrl = `${WPT_BASE}/result/${encodeURIComponent(testId)}/`;
    const jsonUrl = `${WPT_BASE}/jsonResult.php?test=${encodeURIComponent(testId)}&f=json`;

    if (phase !== 'finished') {
      // Update or create test result in database for non-finished states
      try {
        if (existingTest) {
          await testResultsService.update(testId, {
            phase,
            statusText,
            ...(siteUrl && !existingTest.title && { title: undefined }), // Will fetch title when finished
          });
        } else if (siteUrl) {
          // Create new test entry
          await testResultsService.create({
            testId,
            url: siteUrl,
            phase,
            statusText,
            summaryUrl,
            jsonUrl,
          });
        }
      } catch (dbError) {
        console.error('Database write failed:', dbError);
        // Continue without database caching
      }

      const payload: NonFinishedPayload = {
        statusCode,
        statusText,
        phase: phase as Exclude<Phase, 'finished'>,
        siteUrl,
        summaryUrl,
        jsonUrl,
      };
      return res.status(200).json(payload);
    }

    const fv = json?.data?.runs?.['1']?.firstView ?? json?.data?.average?.firstView;
    if (!fv) return res.status(502).json({ error: 'Missing firstView in WPT response' });

    const ttfbMs = Number(fv.TTFB ?? fv.ttfb ?? 0) || 0;
    const fcpMs = Number(fv.firstContentfulPaint ?? fv['firstContentfulPaint'] ?? 0) || 0;
    const speedIndexMs = Number(fv.SpeedIndex ?? fv.speedIndex ?? 0) || 0;
    const onLoadMs = Number(fv.loadTime ?? 0) || 0;
    const fullyLoadedMs = Number(fv.fullyLoaded ?? onLoadMs) || 0;
    const transferredBytes = Number(fv.bytesIn ?? fv.bytesInDoc ?? 0) || 0;

    const reqVal = fv.requests;
    const requests =
      Array.isArray(reqVal)
        ? reqVal.length
        : typeof reqVal === 'number'
        ? reqVal
        : Number(fv.requestsDoc ?? 0) || 0;

    let lcpMs: number | null = null;
    const lhLcp = json?.data?.lighthouse?.audits?.['largest-contentful-paint']?.numericValue;
    const chromeLcp = fv?.chromeUserTiming?.LargestContentfulPaint;
    if (typeof lhLcp === 'number') lcpMs = lhLcp;
    else if (typeof chromeLcp === 'number') lcpMs = chromeLcp;

    const metrics: Metrics = {
      ttfbMs,
      fcpMs,
      speedIndexMs,
      lcpMs,
      requests,
      transferredBytes,
      onLoadMs,
      fullyLoadedMs,
    };

    let siteTitle: string | undefined;
    if (siteUrl) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      siteTitle = await fetchTitle(siteUrl, ctrl.signal);
      clearTimeout(t);
    }

    const runAt = wptCompleted || new Date().toISOString();

    // Update or create finished test result in database
    try {
      if (existingTest) {
        await testResultsService.update(testId, {
          phase: 'finished',
          statusText,
          metrics,
          title: siteTitle,
          summaryUrl,
          jsonUrl,
        });
      } else if (siteUrl) {
        await testResultsService.create({
          testId,
          url: siteUrl,
          title: siteTitle,
          phase: 'finished',
          statusText,
          summaryUrl,
          jsonUrl,
          metrics,
        });
      }
    } catch (dbError) {
      console.error('Database write failed for finished test:', dbError);
      // Continue without database caching
    }

    const payload: FinishedPayload = {
      statusCode,
      statusText,
      phase: 'finished',
      metrics,
      siteUrl,
      siteTitle,
      runAt,
      summaryUrl,
      jsonUrl,
    };

    return res.status(200).json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return res.status(500).json({ error: message });
  }
}
