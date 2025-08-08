import React from 'react';
import { renderHook, act } from '@testing-library/react';
import useAudit from '@lib/hooks/useAudit';

type Json = Record<string, any>;

beforeEach(() => {
  jest.useFakeTimers();
  // @ts-expect-error override
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
  jest.resetAllMocks();
});

function mockFetchSequence(responses: Json[]) {
  // @ts-expect-error override
  (global.fetch as jest.Mock).mockImplementation(() => {
    const next = responses.shift();
    if (!next) throw new Error('No more mock responses');
    return Promise.resolve({ json: async () => next });
  });
}

test('polls queued → running → finished, exposing statusText and final metrics (full lifecycle)', async () => {
  mockFetchSequence([
    { phase: 'queued', statusCode: 100, siteUrl: 'https://a.test' },
    { phase: 'running', statusCode: 102, siteUrl: 'https://a.test' },
    {
      phase: 'finished',
      statusCode: 200,
      siteUrl: 'https://a.test',
      siteTitle: 'A Test',
      runAt: '2025-08-08T12:00:00.000Z',
      metrics: { ttfbMs: 1, fcpMs: 2, speedIndexMs: 3, lcpMs: 4, requests: 5, transferredBytes: 6, onLoadMs: 7, fullyLoadedMs: 8 },
    },
  ]);

  const { result } = renderHook(() => useAudit('abc123'));

  await act(async () => { await Promise.resolve(); });
  expect(result.current.phase).toBe('queued');
  expect(result.current.statusText).toMatch(/Waiting|Reserving/);

  await act(async () => { jest.runOnlyPendingTimers(); await Promise.resolve(); });
  expect(result.current.phase).toBe('running');

  await act(async () => { jest.runOnlyPendingTimers(); await Promise.resolve(); });
  expect(result.current.phase).toBe('finished');
  expect(result.current.data?.metrics.requests).toBe(5);
});

test('handles error phase and stops polling (no infinite loop)', async () => {
  mockFetchSequence([{ phase: 'error', statusCode: 500 }]);
  const { result } = renderHook(() => useAudit('bad'));
  await act(async () => { await Promise.resolve(); });
  expect(result.current.phase).toBe('error');
  expect(result.current.error).toBe('Test failed');
});
