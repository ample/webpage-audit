import type { NextApiRequest, NextApiResponse } from 'next';

const WPT_BASE = 'https://www.webpagetest.org';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { url } = req.body as { url?: string };
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const params = new URLSearchParams({
    url,
    f: 'json',
    k: process.env.WPT_API_KEY!,
  });

  const wptRes = await fetch(`${WPT_BASE}/runtest.php?${params}`);
  if (!wptRes.ok) return res.status(502).json({ error: 'WPT request failed' });

  const data = await wptRes.json();
  return res.status(200).json(data);   // contains testId & polling URLs
}
