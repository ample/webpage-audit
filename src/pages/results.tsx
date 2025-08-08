import type { GetServerSideProps } from 'next';
import { useEffect, useState, useRef } from 'react';
import useAudit from '@lib/hooks/useAudit';
import LoadingSpinner from '@components/LoadingSpinner';
import MetricsCards from '@components/MetricsCards';
import Recommendations from '@components/Recommendations';

type ResultsPageProps = { testId: string };

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

export default function ResultsPage({ testId }: ResultsPageProps) {
  const { data, loading, error, statusText, phase } = useAudit(testId);

  const title = data?.siteTitle || formatHost(data?.siteUrl);
  const runDate = formatRunDate(data?.runAt);

  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (data?.metrics && !showResults) {
      setShowResults(true);
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [data?.metrics, showResults]);

  // If the hook is in any loading state and phase is already 'finished',
  // we know we're just hydrating a completed run: change the label.
  const loadingLabel =
    phase === 'finished' ? 'Loading results…' : (statusText || 'Running test…');

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <section className="mx-auto max-w-4xl px-6 py-12 space-y-10">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-500 to-blue-600 p-[1px] shadow-lg">
          <header className="rounded-2xl bg-white px-6 py-6 sm:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Results{title ? ` · ${title}` : ''}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1">
                Test ID: {testId}
              </span>
              {data?.siteUrl && (
                <a
                  href={data.siteUrl}
                  className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 underline decoration-blue-300 underline-offset-4 hover:no-underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {formatHost(data.siteUrl)}
                </a>
              )}
              {runDate && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  Run: {runDate}
                </span>
              )}
            </div>
          </header>
        </div>

        {loading && (
          <div className="flex items-center">
            <LoadingSpinner label={loadingLabel} />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            {error}
          </div>
        )}

        {data?.metrics && (
          <div
            ref={resultsRef}
            className={`space-y-10 transform transition duration-500 ease-out ${
              showResults ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
          >
            <MetricsCards metrics={data.metrics} />

            <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-md backdrop-blur">
              <Recommendations metrics={data.metrics} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<ResultsPageProps> = async (ctx) => {
  const q = ctx.query?.testId;
  const testId = typeof q === 'string' ? q.trim() : '';

  if (!testId) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: { testId },
  };
};
