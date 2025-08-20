import type { GetServerSideProps } from 'next';
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import useAudit from '@lib/hooks/useAudit';
import LoadingSpinner from '@components/LoadingSpinner';
import MetricsCards, { type MetricDetail } from '@components/MetricsCards';
import Recommendations from '@components/Recommendations';
import MetricModal from '@components/MetricModal';
import TestTimer from '@components/TestTimer';
import SiteHeader from '@components/SiteHeader';
import { runTest } from '@lib/api';
import A11yPanel from '@components/A11yPanel';

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
  const router = useRouter();
  const { data, loading, error, statusText, phase, testStartTime, ai, a11y, isHistorical } = useAudit(testId);

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

  // Clearer messaging while opening old results
  const loadingLabel = isHistorical
    ? 'Loading saved results…'
    : (phase === 'finished' ? 'Loading results…' : (statusText || 'Running test…'));

  async function handleRetry() {
    if (!data?.siteUrl) return;
    try {
      const params = new URLSearchParams();
      if (useAiInsights) params.set('ai', 'true');
      const { testId: newId } = await runTest(data.siteUrl);
      params.set('testId', newId);
      router.push(`/results?${params.toString()}`);
    } catch {}
  }

  const wptSummaryUrl = data?.summaryUrl || (testId ? `https://www.webpagetest.org/result/${encodeURIComponent(testId)}/` : undefined);
  const wptJsonUrl = data?.jsonUrl || (testId ? `https://www.webpagetest.org/jsonResult.php?test=${encodeURIComponent(testId)}&f=json` : undefined);

  return (
    <>
      <Head>
        <title>{title ? `${title} - Lightning Load Results` : 'Lightning Load Results'}</title>
        <meta name="description" content="WebPageTest performance results with actionable insights to make your website load faster" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <SiteHeader />

        <main>
          <section className="mx-auto max-w-4xl px-6 pt-12 pb-24 space-y-10">
            {/* Hide header until metrics are ready to avoid an “empty results” frame during loading */}
            {data?.metrics && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
                <header>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-100">
                    Results{title ? ` · ${title}` : ''}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-300">
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
                    {wptSummaryUrl && (
                      <a
                        href={wptSummaryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-1 text-amber-300 underline decoration-amber-600/60 underline-offset-4 hover:no-underline"
                      >
                        View full WebPageTest report
                      </a>
                    )}
                    {wptJsonUrl && (
                      <a
                        href={wptJsonUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-1 text-slate-300 underline decoration-slate-600/60 underline-offset-4 hover:no-underline"
                      >
                        JSON
                      </a>
                    )}
                  </div>
                </header>
              </div>
            )}

            {loading && (
              <div className="space-y-3">
                <div className="flex items-center">
                  <LoadingSpinner label={loadingLabel} />
                </div>
                {/* If you’d like to avoid confusion for historical loads, hide the timer: */}
                {!isHistorical && <TestTimer startTime={testStartTime} />}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-rose-200 shadow-sm space-y-3">
                <div>{error}</div>
                <div className="flex gap-3">
                  <Link href="/" className="rounded bg-slate-800 px-3 py-1.5 text-slate-200 ring-1 ring-inset ring-slate-700 hover:bg-slate-700">Back</Link>
                  {data?.siteUrl && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="rounded bg-gradient-to-r from-yellow-600 to-orange-500 px-3 py-1.5 font-semibold text-white shadow hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            )}

            {data?.metrics && (
              <div
                ref={resultsRef}
                className={`space-y-10 transform transition duration-500 ease-out ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
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

                {(a11y.loading || a11y.error || a11y.report) && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-md backdrop-blur">
                    {a11y.loading && <div className="text-slate-300">Running accessibility checks…</div>}
                    {a11y.error && <div className="text-rose-300">{a11y.error}</div>}
                    {a11y.report && <A11yPanel report={a11y.report} />}
                  </div>
                )}
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
    return { redirect: { destination: '/', permanent: false } };
  }
  return { props: { testId } };
};
