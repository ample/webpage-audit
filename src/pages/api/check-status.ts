import type { NextApiRequest, NextApiResponse } from 'next';

const WPT_BASE = 'https://www.webpagetest.org';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { testId } = req.query;
  if (!testId) return res.status(400).json({ error: 'Missing testId' });

  const statusRes = await fetch(`${WPT_BASE}/jsonResult.php?test=${testId}&f=json`);
  if (!statusRes.ok) return res.status(502).json({ error: 'Status fetch failed' });

  const json = await statusRes.json();
  return res.status(200).json(json);   // frontend will parse metrics / statusCode
}
