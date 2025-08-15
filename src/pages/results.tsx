import type { GetServerSideProps } from 'next';
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import useAudit from '@lib/hooks/useAudit';
import LoadingSpinner from '@components/LoadingSpinner';
import MetricsCards, { type MetricDetail } from '@components/MetricsCards';
import Recommendations from '@components/Recommendations';
import MetricModal from '@components/MetricModal';
import TestTimer from '@components/TestTimer';
import SiteHeader from '@components/SiteHeader';

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
  const { data, loading, error, statusText, phase, testStartTime, ai } = useAudit(testId);
  
  // Check for AI feature flag in query params
  const [useAiInsights, setUseAiInsights] = useState(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setUseAiInsights(urlParams.get('ai') === 'true');
  }, []);

  const title = data?.siteTitle || formatHost(data?.siteUrl);
  const runDate = formatRunDate(data?.runAt);

  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [selected, setSelected] = useState<MetricDetail | null>(null);

  useEffect(() => {
    if (data?.metrics && !showResults) {
      setShowResults(true);
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [data?.metrics, showResults]);

  const loadingLabel =
    phase === 'finished' ? 'Loading results…' : (statusText || 'Running test…');

  return (
    <>
      <Head>
        <title>{title ? `${title} - Lightning Load Results` : 'Lightning Load Results'}</title>
        <meta name="description" content="WebPageTest performance results with actionable insights to make your website load faster" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <SiteHeader />
        
        <main>
          <section className="mx-auto max-w-4xl px-6 py-12 space-y-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <header>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">
              Results{title ? ` · ${title}` : ''}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
              <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-1">
                Test ID: {testId}
              </span>
              {data?.siteUrl && (
                <a
                  href={data.siteUrl}
                  className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-1 text-sky-400 underline decoration-sky-600/60 underline-offset-4 hover:no-underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {formatHost(data.siteUrl)}
                </a>
              )}
              {runDate && (
                <span className="inline-flex items-center rounded-full bg-emerald-900/40 px-2.5 py-1 text-emerald-300">
                  Run: {runDate}
                </span>
              )}
            </div>
          </header>
        </div>

        {loading && (
          <div className="space-y-3">
            <div className="flex items-center">
              <LoadingSpinner label={loadingLabel} />
            </div>
            <TestTimer startTime={testStartTime} />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-rose-200 shadow-sm">
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
            <MetricsCards metrics={data.metrics} onSelect={(d) => setSelected(d)} />

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-md backdrop-blur">
              <Recommendations 
                metrics={data.metrics}
                aiSuggestions={ai.suggestions}
                aiLoading={ai.loading}
                aiError={ai.error}
                useAiInsights={useAiInsights}
              />
            </div>
          </div>
        )}
          </section>
        </main>

        <MetricModal detail={selected} onClose={() => setSelected(null)} />
      </div>
    </>
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
