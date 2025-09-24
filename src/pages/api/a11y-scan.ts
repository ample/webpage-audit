import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { a11yReportsService } from '@/lib/db/services';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

type A11yViolationNode = {
  html?: string;
  target?: string[];
  failureSummary?: string;
};

type A11yImpact = 'minor' | 'moderate' | 'serious' | 'critical';

type A11yViolation = {
  id: string;
  impact?: A11yImpact;
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

export const config = { runtime: 'nodejs' };

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS ?? 60 * 60 * 24 * 7);

/** --------- safe parsers for unknown --------- */
function get(o: unknown, key: string): unknown {
  return o && typeof o === 'object' ? (o as Record<string, unknown>)[key] : undefined;
}
function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function asStringArray(v: unknown): string[] | undefined {
  return Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : undefined;
}
function asImpact(v: unknown): A11yImpact | undefined {
  const s = asString(v);
  if (s === 'minor' || s === 'moderate' || s === 'serious' || s === 'critical') return s;
  return undefined;
}

/** Normalize various MCP/axe-like payload shapes into our A11yReport */
function normalizeResult(url: string, raw: unknown): A11yReport {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // counts can be under data.counts.*, or we can infer from arrays
  const countsObj = get(data, 'counts');

  const violationsCount =
    asNumber(get(countsObj, 'violations')) ??
    (Array.isArray(get(data, 'violations')) ? (get(data, 'violations') as unknown[]).length : 0);

  const passesCount =
    asNumber(get(countsObj, 'passes')) ??
    (Array.isArray(get(data, 'passes')) ? (get(data, 'passes') as unknown[]).length : 0);

  const incompleteCount =
    asNumber(get(countsObj, 'incomplete')) ??
    (Array.isArray(get(data, 'incomplete')) ? (get(data, 'incomplete') as unknown[]).length : 0);

  const inapplicableCount =
    asNumber(get(countsObj, 'inapplicable')) ??
    (Array.isArray(get(data, 'inapplicable')) ? (get(data, 'inapplicable') as unknown[]).length : 0);

  const violationsRaw = get(data, 'violations');
  const violations: A11yViolation[] = Array.isArray(violationsRaw)
    ? (violationsRaw as unknown[]).map((v): A11yViolation => {
        const id = asString(get(v, 'id')) ?? '';
        const impact = asImpact(get(v, 'impact'));
        const help = asString(get(v, 'help')) ?? asString(get(v, 'description')) ?? 'Issue';
        const description = asString(get(v, 'description')) ?? '';
        const helpUrl = asString(get(v, 'helpUrl')) ?? '';

        const nodesRaw = get(v, 'nodes');
        const nodes: A11yViolationNode[] = Array.isArray(nodesRaw)
          ? (nodesRaw as unknown[]).map((n): A11yViolationNode => {
              const html = asString(get(n, 'html'));
              const target = asStringArray(get(n, 'target'));
              const failureSummary = asString(get(n, 'failureSummary'));
              return { html, target, failureSummary };
            })
          : [];

        return { id, impact, help, description, helpUrl, nodes };
      })
    : [];

  return {
    url,
    summary: {
      violations: violationsCount || 0,
      passes: passesCount || 0,
      incomplete: incompleteCount || 0,
      inapplicable: inapplicableCount || 0,
    },
    violations,
    generatedAt: new Date().toISOString(),
  };
}

/** Resolve the CLI path robustly for serverless */
function resolveA11yMcpCommand(): { command: string; args: string[] } {
  const override = process.env.A11Y_MCP_COMMAND?.trim();
  if (override) return { command: override, args: [] };

  const binName = process.platform === 'win32' ? 'a11y-mcp-server.cmd' : 'a11y-mcp-server';
  const localBin = path.join(process.cwd(), 'node_modules', '.bin', binName);
  if (fs.existsSync(localBin)) {
    return { command: localBin, args: [] };
    }
  return { command: 'npx', args: ['-y', 'a11y-mcp-server'] };
}

type ToolContent =
  | { type: 'json'; json: unknown }
  | { type: 'text'; text: string }
  | { type: string; [k: string]: unknown };

type ToolResponse = { content?: ToolContent[] };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { url, tags } = req.body as { url?: string; tags?: string[] };
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Invalid url' });
  }

  try {
    // Check for cached report
    const cached = await a11yReportsService.get(url);
    if (cached) {
      return res.status(200).json({ cached: true, report: cached });
    }

    // Generate new report
    const report = await (async (): Promise<A11yReport> => {
      const { command, args } = resolveA11yMcpCommand();

      const client = new Client({ name: 'wa-audit-a11y', version: '1.0.0' });
      const transport = new StdioClientTransport({
        command,
        args,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
          CI: '1',
        } as Record<string, string>,
      });

      await client.connect(transport);

      const result = await client.callTool({
        name: 'test_accessibility',
        arguments: { url, tags: Array.isArray(tags) ? tags : undefined },
      });

      await client.close();

      const tool = result as ToolResponse;
      const first = Array.isArray(tool.content) ? tool.content[0] : undefined;

      let raw: unknown = null;
      if (first && first.type === 'json') raw = (first as Extract<ToolContent, { type: 'json' }>).json;
      else if (first && first.type === 'text') raw = (first as Extract<ToolContent, { type: 'text' }>).text;
      else raw = result;

      return normalizeResult(url, raw);
    })();

    // Cache the report
    await a11yReportsService.set(url, report, CACHE_TTL_SECONDS);

    return res.status(200).json({ cached: false, report });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint = msg.includes('Connection closed')
      ? 'Accessibility engine failed to start on this environment.'
      : undefined;
    return res.status(500).json({ error: hint ? `${msg} (${hint})` : msg });
  }
}
