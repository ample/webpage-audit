import React from 'react';
import { renderHook, act } from '@testing-library/react';
import useAudit from '@lib/hooks/useAudit';

type Json = Record<string, any>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock URLSearchParams - use beforeEach to avoid JSDOM issues
let mockLocation: any;

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.resetAllMocks();
});

function mockFetchSequence(responses: Json[]) {
  let callCount = 0;
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('/api/check-status')) {
      const next = responses[callCount];
      if (!next) throw new Error('No more mock responses');
      callCount++;
      return Promise.resolve({ json: async () => next });
    }
    // Mock other API calls (a11y-scan, etc.)
    return Promise.resolve({ 
      ok: true,
      json: async () => ({ report: { url: 'test', summary: {}, violations: [], generatedAt: new Date().toISOString() } })
    });
  });
}

test('returns initial state correctly', () => {
  const { result } = renderHook(() => useAudit(null));
  
  expect(result.current.data).toBe(null);
  expect(result.current.loading).toBe(false);
  expect(result.current.phase).toBe(null);
  expect(result.current.error).toBe(null);
  expect(result.current.testStartTime).toBe(null);
  expect(result.current.isHistorical).toBe(false);
  expect(result.current.ai).toEqual({ suggestions: null, loading: false, error: null });
  expect(result.current.a11y).toEqual({ report: null, loading: false, error: null });
});

test('starts loading when testId is provided', () => {
  mockFetchSequence([
    { phase: 'queued', statusCode: 100, siteUrl: 'https://a.test', statusText: 'Test created' },
  ]);

  const { result } = renderHook(() => useAudit('abc123'));

  expect(result.current.testStartTime).toBeInstanceOf(Date);
  expect(result.current.loading).toBe(false); // Initially false until first response
  expect(result.current.phase).toBe(null);
});

test('has correct return structure', () => {
  const { result } = renderHook(() => useAudit('test123'));
  
  expect(result.current).toHaveProperty('data');
  expect(result.current).toHaveProperty('loading');
  expect(result.current).toHaveProperty('phase');
  expect(result.current).toHaveProperty('statusText');
  expect(result.current).toHaveProperty('error');
  expect(result.current).toHaveProperty('testStartTime');
  expect(result.current).toHaveProperty('isHistorical');
  expect(result.current).toHaveProperty('ai');
  expect(result.current).toHaveProperty('a11y');
});
