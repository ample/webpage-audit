import { useRouter } from 'next/router';
import useAudit from '@lib/hooks/useAudit';
import LoadingSpinner from '@components/LoadingSpinner';
import MetricsCards from '@components/MetricsCards';
import Recommendations from '@components/Recommendations';

function formatHost(u?: string) {
  try { return u ? new URL(u).host : ''; } catch { return ''; }
}

function formatRunDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ResultsPage() {
  const router = useRouter();
  const testId = typeof router.query.testId === 'string' ? router.query.testId : null;

  const { data, loading, error, statusText } = useAudit(testId);

  const title = data?.siteTitle || formatHost(data?.siteUrl);
  const runDate = formatRunDate(data?.runAt);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">
            Results{title ? ` · ${title}` : ''}
          </h1>
          <div className="text-sm text-gray-600 space-x-2">
            {testId && <span>Test ID: {testId}</span>}
            {data?.siteUrl && (
              <>
                <span>•</span>
                <a href={data.siteUrl} className="underline hover:no-underline" target="_blank" rel="noreferrer">
                  {formatHost(data.siteUrl)}
                </a>
              </>
            )}
            {runDate && (
              <>
                <span>•</span>
                <span>Run: {runDate}</span>
              </>
            )}
          </div>
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
