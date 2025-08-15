import React from 'react';
import { render, screen } from '@testing-library/react';
import ResultsPage from '@/pages/results';

// Mock scrollIntoView which is not available in test environment
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});

jest.mock('@lib/hooks/useAudit', () => ({
  __esModule: true,
  default: jest.fn(),
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
    testStartTime: new Date(),
    ai: { suggestions: null, loading: false, error: null },
  });
  renderPage();
  expect(screen.getByText(/Results/)).toBeInTheDocument();
  expect(screen.getByText(/Test ID: abc/)).toBeInTheDocument();
  expect(screen.getByText(/Reserving an available browser/)).toBeInTheDocument();
});

test('shows metadata + metrics when finished (final report displayed)', () => {
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
    testStartTime: null,
    ai: { suggestions: null, loading: false, error: null },
  });
  renderPage();
  expect(screen.getByText('Results · Example')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'example.com' })).toBeInTheDocument();
  expect(screen.getByText(/Requests/i)).toBeInTheDocument();
});

test('shows error message if hook returns error (user sees failure message)', () => {
  mockUseAudit.mockReturnValue({
    data: null,
    loading: false,
    error: 'Polling failed',
    statusText: '',
    testStartTime: null,
    ai: { suggestions: null, loading: false, error: null },
  });
  renderPage();
  expect(screen.getByText('Polling failed')).toBeInTheDocument();
});
