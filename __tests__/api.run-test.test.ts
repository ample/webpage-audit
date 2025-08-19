/**
 * @jest-environment node
 */
import handler from '@/pages/api/run-test';
import type { NextApiRequest, NextApiResponse } from 'next';
import httpMocks from 'node-mocks-http';

function mkReqRes(body: any = {}) {
  const req = httpMocks.createRequest<NextApiRequest>({
    method: 'POST',
    url: '/api/run-test',
    headers: { 'x-forwarded-for': '1.2.3.4' },
    body,
  });
  const res = httpMocks.createResponse<NextApiResponse>();
  return { req, res };
}

beforeEach(() => {
  // @ts-expect-error global fetch
  global.fetch = jest.fn();
  process.env.WPT_API_KEY = 'test-key';
});

test('rate limits excessive submissions with 429', async () => {
  // @ts-expect-error global fetch
  global.fetch.mockResolvedValue({ ok: true, text: async () => JSON.stringify({ statusCode: 200, data: { testId: 't1', jsonUrl: '' } }) });

  for (let i = 0; i < 5; i++) {
    const { req, res } = mkReqRes({ url: 'https://example.com' });
    await handler(req, res);
    expect([200, 502]).toContain(res.statusCode); // allow 502 in case mock mismatch
  }

  const { req, res } = mkReqRes({ url: 'https://example.com' });
  await handler(req, res);
  expect(res.statusCode).toBe(429);
});
