export interface RunTestResponse {
  testId: string;
  jsonUrl?: string;
}
export interface CheckStatusResponse {
  statusCode?: number;
  data?: unknown;
  statusText?: string;
  error?: string;
}

export async function runTest(url: string, location?: string): Promise<RunTestResponse> {
  const res = await fetch('/api/run-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, ...(location ? { location } : {}) }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to start test');
  return json as RunTestResponse;
}

export async function checkStatus(testId: string): Promise<CheckStatusResponse> {
  const res = await fetch(`/api/check-status?testId=${encodeURIComponent(testId)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to fetch status');
  return json as CheckStatusResponse;
}

export async function getAiInsights(
  metrics: {
    ttfbMs: number; fcpMs: number; speedIndexMs: number; lcpMs?: number | null;
    requests: number; transferredBytes: number; onLoadMs?: number; fullyLoadedMs?: number;
  },
  siteUrl?: string,
  siteTitle?: string
): Promise<string[]> {
  try {
    const res = await fetch('/api/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics, siteUrl, siteTitle }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'AI call failed');
    return Array.isArray(json?.suggestions) ? json.suggestions : [];
  } catch (e: unknown) {
    throw new Error(e instanceof Error ? e.message : 'AI call failed');
  }
}
