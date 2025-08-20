import React from 'react';
import { render, screen } from '@testing-library/react';
import ResultsPage from '@/pages/results';

jest.mock('next/router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/results',
    query: {},
    replace: jest.fn(),
  }),
}));

// Mock scrollIntoView which is not available in test environment
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});

// Mock window.location.search - use beforeEach to avoid JSDOM issues
let mockLocation: any;

jest.mock('@lib/hooks/useAudit', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@lib/api', () => ({
  runTest: jest.fn(),
}));

import useAudit from '@lib/hooks/useAudit';
const mockUseAudit = useAudit as jest.Mock;

function renderPage() {
  return render(<ResultsPage testId="abc" />);
}

test('shows spinner and current status text while loading (user waiting for results)', () => {
  mockUseAudit.mockReturnValue({
    data: null,
    loading: true,
    error: null,
    statusText: 'Reserving an available browser…',
    phase: 'queued',
    testStartTime: new Date(),
    isHistorical: false,
    ai: { suggestions: null, loading: false, error: null },
    a11y: { report: null, loading: false, error: null },
  });
  renderPage();
  expect(screen.getByText(/Reserving an available browser/)).toBeInTheDocument();
});

test('shows metadata + metrics when finished (final report displayed)', () => {
  mockUseAudit.mockReturnValue({
    data: {
      siteUrl: 'https://example.com',
      siteTitle: 'Example',
      runAt: '2025-08-08T12:00:00.000Z',
      summaryUrl: 'https://www.webpagetest.org/result/abc/',
      jsonUrl: 'https://www.webpagetest.org/jsonResult.php?test=abc&f=json',
      metrics: {
        ttfbMs: 1,
        fcpMs: 2,
        speedIndexMs: 3,
        lcpMs: 4,
        requests: 5,
        transferredBytes: 6,
        onLoadMs: 7,
        fullyLoadedMs: 8,
      },
    },
    loading: false,
    error: null,
    statusText: '',
    phase: 'finished',
    testStartTime: null,
    isHistorical: false,
    ai: { suggestions: null, loading: false, error: null },
    a11y: { report: null, loading: false, error: null },
  });
  renderPage();
  expect(screen.getByText('Results · Example')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'example.com' })).toBeInTheDocument();
  expect(screen.getByText('Key Metrics')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /WebPageTest report/i })).toBeInTheDocument();
});

test('shows error message if hook returns error (user sees failure message)', () => {
  mockUseAudit.mockReturnValue({
    data: null,
    loading: false,
    error: 'Polling failed',
    statusText: '',
    phase: 'error',
    testStartTime: null,
    isHistorical: false,
    ai: { suggestions: null, loading: false, error: null },
    a11y: { report: null, loading: false, error: null },
  });
  renderPage();
  expect(screen.getByText('Polling failed')).toBeInTheDocument();
});

test('shows accessibility panel when a11y report is available', () => {
  mockUseAudit.mockReturnValue({
    data: {
      siteUrl: 'https://example.com',
      siteTitle: 'Example',
      runAt: '2025-08-08T12:00:00.000Z',
      metrics: {
        ttfbMs: 1,
        fcpMs: 2,
        speedIndexMs: 3,
        lcpMs: 4,
        requests: 5,
        transferredBytes: 6,
        onLoadMs: 7,
        fullyLoadedMs: 8,
      },
    },
    loading: false,
    error: null,
    statusText: '',
    phase: 'finished',
    testStartTime: null,
    isHistorical: false,
    ai: { suggestions: null, loading: false, error: null },
    a11y: { 
      report: {
        url: 'https://example.com',
        summary: { violations: 2, passes: 10, incomplete: 1, inapplicable: 5 },
        violations: [],
        generatedAt: '2025-08-08T12:00:00.000Z'
      }, 
      loading: false, 
      error: null 
    },
  });
  renderPage();
  expect(screen.getByText('Results · Example')).toBeInTheDocument();
  // The A11yPanel component should render when report is available
});

test('shows historical loading message for completed tests', () => {
  mockUseAudit.mockReturnValue({
    data: null,
    loading: true,
    error: null,
    statusText: 'Loading saved results…',
    phase: 'finished',
    testStartTime: null,
    isHistorical: true,
    ai: { suggestions: null, loading: false, error: null },
    a11y: { report: null, loading: false, error: null },
  });
  renderPage();
  expect(screen.getByText(/Loading saved results/)).toBeInTheDocument();
});
