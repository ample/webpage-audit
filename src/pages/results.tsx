// pages/results.tsx
import { useRouter } from 'next/router';
import useAudit from '@lib/hooks/useAudit';
import LoadingSpinner from '@components/LoadingSpinner';
import MetricsCards from '@components/MetricsCards';
import Recommendations from '@components/Recommendations';

export default function ResultsPage() {
  const router = useRouter();
  const testId = typeof router.query.testId === 'string' ? router.query.testId : null;

  const { data, loading, error, statusText } = useAudit(testId);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Results</h1>
          {testId && <p className="text-sm text-gray-600">Test ID: {testId}</p>}
        </header>

        {!testId && <p className="text-red-600">Missing testId. Go back and start a test.</p>}

        {testId && loading && (
          <div className="flex items-center">
            <LoadingSpinner label={statusText || 'Running test…'} />
          </div>
        )}

        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}

        {data?.metrics && (
          <div className="space-y-8">
            <MetricsCards metrics={data.metrics} />
            <Recommendations metrics={data.metrics} />
          </div>
        )}
      </section>
    </main>
  );
}
