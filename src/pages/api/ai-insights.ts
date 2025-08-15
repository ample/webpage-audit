import type { NextApiRequest, NextApiResponse } from 'next';

type Metrics = {
  ttfbMs: number;
  fcpMs: number;
  speedIndexMs: number;
  lcpMs?: number | null;
  requests: number;
  transferredBytes: number;
  onLoadMs?: number;
  fullyLoadedMs?: number;
};

type Payload = { suggestions: string[] } | { error: string };

const MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620';

export default async function handler(req: NextApiRequest, res: NextApiResponse<Payload>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!process.env.CLAUDE_API_KEY) return res.status(501).json({ error: 'AI not configured' });

  try {
    const { metrics, siteUrl, siteTitle } = req.body as { metrics: Metrics; siteUrl?: string; siteTitle?: string };

    if (!metrics || typeof metrics !== 'object') {
      return res.status(400).json({ error: 'Missing metrics' });
    }

    const summary = {
      url: siteUrl || '',
      title: siteTitle || '',
      ttfbMs: metrics.ttfbMs,
      fcpMs: metrics.fcpMs,
      lcpMs: metrics.lcpMs ?? null,
      speedIndexMs: metrics.speedIndexMs,
      requests: metrics.requests,
      transferredMB: Number((metrics.transferredBytes / 1024 / 1024).toFixed(2)),
      onLoadMs: metrics.onLoadMs ?? null,
      fullyLoadedMs: metrics.fullyLoadedMs ?? null,
    };

    const prompt = [
      'You are a friendly web performance consultant. Given these WebPageTest results, provide 3-5 recommendations.',
      'Write in a casual, supportive but profressional tone. Assume the user is moderately technical. Try not to repeat yourself across recommendations.',
      'Do not add superfluous greetings or refer to yourself in the first person.',
      'Focus on the biggest wins: server response time, render-blocking resources, image optimization, third-party scripts, and resource delivery.',
      'Make each recommendation feel approachable and explain the "why" briefly. Avoid overly-technical jargon and focus on highest impact points',
      'Return ONLY a JSON array of strings. No prose, no keys.',
      '',
      JSON.stringify(summary, null, 2),
    ].join('\n');

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: 'You are a helpful, encouraging web performance consultant. Write recommendations in a friendly, conversational tone that makes optimization feel approachable and achievable.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const json = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: json?.error?.message || 'AI request failed' });
    }

    const textBlock = Array.isArray(json?.content) && json.content.find((b: { type?: string }) => b?.type === 'text');
    const text = textBlock?.text || '';

    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) suggestions = parsed.filter((x) => typeof x === 'string');
    } catch {
      // fallback: split lines
      suggestions = String(text).split('\n').map((s) => s.trim()).filter(Boolean);
    }

    // de-dup and trim
    const dedup = Array.from(new Set(suggestions.map((s) => s.replace(/^-+\s*/, '').trim()))).slice(0, 6);

    return res.status(200).json({ suggestions: dedup });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return res.status(500).json({ error: message });
  }
}
