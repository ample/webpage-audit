import type { NextApiRequest, NextApiResponse } from 'next';

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

type Payload =
  | { statusCode: number; statusText?: string; phase: Phase }
  | { statusCode: 200; statusText?: string; phase: 'finished'; metrics: Metrics };

const STATUS_TEXT_FALLBACK: Record<number, string> = {
  100: 'Test created',
  101: 'Test started',
  102: 'Running',
  200: 'Completed',
  400: 'Bad request',
  404: 'Not found',
  500: 'Server error',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Payload | { error: string }>
) {
  const testId = req.query.testId;
  if (!testId || typeof testId !== 'string') {
    return res.status(400).json({ error: 'Missing testId' });
  }

  try {
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

    if (phase !== 'finished') {
      return res.status(200).json({ statusCode, statusText, phase });
    }

    const fv =
      json?.data?.runs?.['1']?.firstView ?? json?.data?.average?.firstView;
    if (!fv) return res.status(502).json({ error: 'Missing firstView in WPT response' });

    const ttfbMs = Number(fv.TTFB ?? fv.ttfb ?? 0) || 0;
    const fcpMs = Number(fv.firstContentfulPaint ?? fv['firstContentfulPaint'] ?? 0) || 0;
    const speedIndexMs = Number(fv.SpeedIndex ?? fv.speedIndex ?? 0) || 0;
    const onLoadMs = Number(fv.loadTime ?? 0) || 0;
    const fullyLoadedMs = Number(fv.fullyLoaded ?? onLoadMs) || 0;
    const transferredBytes = Number(fv.bytesIn ?? fv.bytesInDoc ?? 0) || 0;

    const reqVal = fv.requests;
    const requests =
      Array.isArray(reqVal) ? reqVal.length :
      typeof reqVal === 'number' ? reqVal :
      Number(fv.requestsDoc ?? 0) || 0;

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

    return res.status(200).json({ statusCode, statusText, phase: 'finished', metrics });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return res.status(500).json({ error: message });
  }
}
