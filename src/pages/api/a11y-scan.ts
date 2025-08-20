import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { withCache } from '@lib/server/cache';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

type A11yViolationNode = {
  html?: string;
  target?: string[];
  failureSummary?: string;
};

type A11yViolation = {
  id: string;
  impact?: 'minor' | 'moderate' | 'serious' | 'critical';
  help: string;
  description?: string;
  helpUrl?: string;
  nodes?: A11yViolationNode[];
};

type A11yReport = {
  url: string;
  summary: {
    violations: number;
    passes: number;
    incomplete: number;
    inapplicable: number;
  };
  violations: A11yViolation[];
  generatedAt: string;
};

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS ?? 60 * 60 * 24 * 7);

function sha1(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

function normalizeResult(url: string, raw: unknown): A11yReport {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

  const summary = {
    violations: Number(data?.counts?.violations ?? data?.violations?.length ?? 0) || 0,
    passes: Number(data?.counts?.passes ?? data?.passes?.length ?? 0) || 0,
    incomplete: Number(data?.counts?.incomplete ?? data?.incomplete?.length ?? 0) || 0,
    inapplicable: Number(data?.counts?.inapplicable ?? data?.inapplicable?.length ?? 0) || 0,
  };

  const violations: A11yViolation[] = Array.isArray(data?.violations)
    ? data.violations.map((v: unknown) => {
        const violation = v as Record<string, unknown>;
        return {
          id: String(violation?.id ?? ''),
          impact: violation?.impact as A11yViolation['impact'],
          help: String(violation?.help ?? violation?.description ?? 'Issue'),
          description: violation?.description as string ?? '',
          helpUrl: violation?.helpUrl as string ?? '',
          nodes: Array.isArray(violation?.nodes)
            ? violation.nodes.map((n: unknown) => {
                const node = n as Record<string, unknown>;
                return {
                  html: node?.html as string,
                  target: node?.target as string[],
                  failureSummary: node?.failureSummary as string,
                };
              })
            : [],
        };
      })
    : [];

  return {
    url,
    summary,
    violations,
    generatedAt: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { url, tags } = req.body as { url?: string; tags?: string[] };
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Invalid url' });
  }

  const key = `a11y:${sha1(JSON.stringify({ url, tags: tags || [] }))}`;

  try {
    const report = await withCache<A11yReport>(
      key,
      CACHE_TTL_SECONDS,
      async () => {
        const client = new Client({ name: 'll-audit-a11y', version: '1.0.0' });
        const transport = new StdioClientTransport({
          command: 'npx',
          args: ['-y', 'a11y-mcp-server'],
          env: process.env as Record<string, string>,
        });

        await client.connect(transport);

        const result = await client.callTool({
          name: 'test_accessibility',
          arguments: { url, tags: Array.isArray(tags) ? tags : undefined },
        });

        await client.close();

        let raw: unknown = null;
        const c = Array.isArray(result?.content) ? result.content[0] : null;
        if (c && c.type === 'json') raw = c.json;
        else if (c && c.type === 'text') raw = c.text;
        else raw = result;

        return normalizeResult(url, raw);
      }
    );

    return res.status(200).json({ cached: false, report });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'a11y scan failed';
    return res.status(500).json({ error: errorMessage });
  }
}
