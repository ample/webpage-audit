// pages/api/ai-insights.ts
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

// ---- Simple in-memory cache (server warm cache) ----
type CacheEntry = { suggestions: string[]; at: number };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function now() { return Date.now(); }
function isFresh(entry?: CacheEntry | undefined) {
  return !!entry && now() - entry.at < CACHE_TTL_MS;
}
function makeKey(body: any): string {
  if (body?.testId && typeof body.testId === 'string') return `test:${body.testId}`;
  // fallback: deterministic key from payload (no external hashing lib)
  const summary = {
    url: body?.siteUrl || '',
    title: body?.siteTitle || '',
    ttfbMs: body?.metrics?.ttfbMs ?? null,
    fcpMs: body?.metrics?.fcpMs ?? null,
    lcpMs: body?.metrics?.lcpMs ?? null,
    speedIndexMs: body?.metrics?.speedIndexMs ?? null,
    requests: body?.metrics?.requests ?? null,
    transferredMB: body?.metrics ? Number((body.metrics.transferredBytes / 1024 / 1024).toFixed(2)) : null,
    onLoadMs: body?.metrics?.onLoadMs ?? null,
    fullyLoadedMs: body?.metrics?.fullyLoadedMs ?? null,
  };
  return `sig:${JSON.stringify(summary)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Payload>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!process.env.CLAUDE_API_KEY) return res.status(501).json({ error: 'AI not configured' });

  try {
    const { metrics, siteUrl, siteTitle, testId } = req.body as {
      metrics: Metrics; siteUrl?: string; siteTitle?: string; testId?: string;
    };
    if (!metrics || typeof metrics !== 'object') {
      return res.status(400).json({ error: 'Missing metrics' });
    }

    const cacheKey = makeKey({ metrics, siteUrl, siteTitle, testId });
    const cached = CACHE.get(cacheKey);
    if (isFresh(cached)) {
      return res.status(200).json({ suggestions: cached!.suggestions });
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

    // SAVE to cache
    CACHE.set(cacheKey, { suggestions: dedup, at: now() });

    return res.status(200).json({ suggestions: dedup });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return res.status(500).json({ error: message });
  }
}
