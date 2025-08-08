import React from 'react';
import { render, screen } from '@testing-library/react';
import * as nextRouter from 'next/router';
import ResultsPage from '@/pages/results';

jest.spyOn(nextRouter, 'useRouter').mockReturnValue({
  query: { testId: 'abc' },
} as any);

jest.mock('@lib/hooks/useAudit', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useAudit = require('@lib/hooks/useAudit').default as jest.Mock;

function renderPage() {
  return render(<ResultsPage />);
}

test('shows spinner and current status text while loading (user waiting for results)', () => {
  useAudit.mockReturnValue({
    data: null,
    loading: true,
    error: null,
    statusText: 'Reserving an available browser…',
  });
  renderPage();
  expect(screen.getByText(/Results/)).toBeInTheDocument();
  expect(screen.getByText(/Reserving an available browser/)).toBeInTheDocument();
});

test('shows metadata + metrics when finished (final report displayed)', () => {
  useAudit.mockReturnValue({
    data: {
      siteUrl: 'https://example.com',
      siteTitle: 'Example',
      runAt: '2025-08-08T12:00:00.000Z',
      metrics: { ttfbMs: 1, fcpMs: 2, speedIndexMs: 3, lcpMs: 4, requests: 5, transferredBytes: 6, onLoadMs: 7, fullyLoadedMs: 8 },
    },
    loading: false,
    error: null,
    statusText: '',
  });
  renderPage();
  expect(screen.getByText('Results · Example')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'example.com' })).toBeInTheDocument();
  expect(screen.getByText(/Requests/i)).toBeInTheDocument();
});

test('shows error message if hook returns error (user sees failure message)', () => {
  useAudit.mockReturnValue({
    data: null,
    loading: false,
    error: 'Polling failed',
    statusText: '',
  });
  renderPage();
  expect(screen.getByText('Polling failed')).toBeInTheDocument();
});
