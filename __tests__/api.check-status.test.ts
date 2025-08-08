/**
 * @jest-environment node
 */
import handler from '@/pages/api/check-status';
import type { NextApiRequest, NextApiResponse } from 'next';
import httpMocks from 'node-mocks-http';

function createReqRes(query: Record<string, string>) {
  const req = httpMocks.createRequest<NextApiRequest>({
    method: 'GET',
    url: '/api/check-status',
    query,
  });
  const res = httpMocks.createResponse<NextApiResponse>();
  return { req, res };
}

beforeEach(() => {
  jest.resetAllMocks();
  // @ts-expect-error global fetch
  global.fetch = jest.fn();
  process.env.WPT_API_KEY = 'test-key';
});

test('returns 400 if no testId is provided (prevents undefined requests to WPT)', async () => {
  const { req, res } = createReqRes({});
  await handler(req, res);
  expect(res.statusCode).toBe(400);
});

test('maps WPT queued status to phase "queued" and preserves siteUrl (initial waiting state)', async () => {
  // @ts-expect-error global fetch
  global.fetch.mockResolvedValueOnce({
    json: async () => ({ statusCode: 100, statusText: 'Test created', data: { url: 'https://x.com' } }),
  });

  const { req, res } = createReqRes({ testId: 'abc' });
  await handler(req, res);
  const body = res._getJSONData();
  expect(body.phase).toBe('queued');
  expect(body.siteUrl).toBe('https://x.com');
});

test('maps WPT running status to phase "running" (browser reserved, test in progress)', async () => {
  // @ts-expect-error global fetch
  global.fetch.mockResolvedValueOnce({
    json: async () => ({ statusCode: 102, data: { url: 'https://example.org' } }),
  });

  const { req, res } = createReqRes({ testId: 'abc' });
  await handler(req, res);
  const body = res._getJSONData();
  expect(body.phase).toBe('running');
});

test('maps WPT finished status to phase "finished" and extracts metrics + metadata (final report)', async () => {
  const json = {
    statusCode: 200,
    statusText: 'Completed',
    data: {
      url: 'https://example.com/',
      completed: 1710000000,
      runs: { '1': { firstView: { TTFB: 123, firstContentfulPaint: 456, SpeedIndex: 789, loadTime: 1500, fullyLoaded: 2500, bytesIn: 123456, requests: 42, chromeUserTiming: { LargestContentfulPaint: 2345 } } } },
      lighthouse: { audits: { 'largest-contentful-paint': { numericValue: 2600 } } },
    },
  };
  // First fetch: WPT JSON
  // @ts-expect-error global fetch
  global.fetch.mockResolvedValueOnce({ json: async () => json });
  // Second fetch: HTML title
  // @ts-expect-error global fetch
  global.fetch.mockResolvedValueOnce({ text: async () => '<title>Example — Site</title>' });

  const { req, res } = createReqRes({ testId: 'done123' });
  await handler(req, res);
  const body = res._getJSONData();
  expect(body.phase).toBe('finished');
  expect(body.metrics.ttfbMs).toBe(123);
  expect(body.siteTitle).toBe('Example — Site');
});

test('returns 500 with error message if WPT fetch fails (graceful API failure)', async () => {
  // @ts-expect-error global fetch
  global.fetch.mockRejectedValueOnce(new Error('boom'));
  const { req, res } = createReqRes({ testId: 'x' });
  await handler(req, res);
  expect(res.statusCode).toBe(500);
});
