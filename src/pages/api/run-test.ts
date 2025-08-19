import type { NextApiRequest, NextApiResponse } from 'next';
import { rateLimit } from '@/lib/server/rateLimit';

const WPT_BASE = 'https://www.webpagetest.org';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const ok = rateLimit(`run-test:${ip}`, { windowMs: 60_000, max: 5 });
  if (!ok) return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });

  const { url, location } = req.body as { url?: string; location?: string };
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  if (!process.env.WPT_API_KEY) {
    return res.status(500).json({ error: 'Missing WPT_API_KEY on server' });
  }

  try {
    const params = new URLSearchParams({
      url,
      f: 'json',
      runs: '1',
      fvonly: '1',
      video: '0',
      location: location && typeof location === 'string' && location.trim()
        ? location.trim()
        : 'ec2-us-east-1:Chrome.Cable',
    });

    const r = await fetch(`${WPT_BASE}/runtest.php?${params.toString()}`, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        Accept: 'application/json',
        'X-WPT-API-KEY': process.env.WPT_API_KEY,
      },
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(502).json({ error: `WPT request failed (${r.status})`, preview: text.slice(0, 300) });
    }

    const json = JSON.parse(text);
    const statusCode: number | undefined = json?.statusCode;
    const testId: string | undefined = json?.data?.testId;
    const jsonUrl: string | undefined = json?.data?.jsonUrl;
    const summaryUrl = testId ? `${WPT_BASE}/result/${encodeURIComponent(testId)}/` : undefined;

    if (statusCode !== 200 || !testId) {
      return res.status(502).json({
        error: json?.statusText || 'WebPageTest did not return a testId',
        wpt: { statusCode: json?.statusCode, statusText: json?.statusText },
      });
    }

    return res.status(200).json({ testId, jsonUrl, summaryUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return res.status(500).json({ error: message });
  }
}
