// pages/api/run-test.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const WPT_BASE = 'https://www.webpagetest.org';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { url } = req.body as { url?: string };
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
      // Pick a generally quick public agent. You can change later or make this user-selectable.
      location: 'ec2-us-east-1:Chrome.Cable',
      // lighthouse: '0', // keep off for now; we’ll read LCP if present
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

    if (statusCode !== 200 || !testId) {
      return res.status(502).json({
        error: json?.statusText || 'WebPageTest did not return a testId',
        wpt: { statusCode: json?.statusCode, statusText: json?.statusText },
      });
    }

    return res.status(200).json({ testId, jsonUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return res.status(500).json({ error: message });
  }
}
