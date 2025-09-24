import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { aiInsightsService } from '@/lib/db/services';

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
// Unified TTL for server caches (both AI + a11y), default 7 days.
const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS ?? 60 * 60 * 24 * 7);

function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex');
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

    const cacheKey = testId || `ai:sig:${sha1(JSON.stringify(summary))}`;

    // Check for cached AI insights
    const cached = await aiInsightsService.get(cacheKey);
    if (cached) {
      return res.status(200).json({ suggestions: cached });
    }

    // Generate new AI insights
    const suggestions = await (async () => {
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
            system:
              'You are a helpful, encouraging web performance consultant. Write recommendations in a friendly, conversational tone that makes optimization feel approachable and achievable.',
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        const json = await r.json();
        if (!r.ok) throw new Error(json?.error?.message || 'AI request failed');

        const textBlock = Array.isArray(json?.content) && json.content.find((b: { type?: string }) => b?.type === 'text');
        const text = textBlock?.text || '';

        let suggestions: string[] = [];
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) suggestions = parsed.filter((x) => typeof x === 'string');
        } catch {
          suggestions = String(text).split('\n').map((s) => s.trim()).filter(Boolean);
        }

        const dedup = Array.from(new Set(suggestions.map((s) => s.replace(/^-+\s*/, '').trim()))).slice(0, 6);
        return dedup;
      })();

    // Cache the AI insights
    await aiInsightsService.set(cacheKey, suggestions, CACHE_TTL_SECONDS);

    return res.status(200).json({ suggestions });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return res.status(500).json({ error: message });
  }
}
