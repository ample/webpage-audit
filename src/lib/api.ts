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

export async function runTest(url: string): Promise<RunTestResponse> {
  const res = await fetch('/api/run-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
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
