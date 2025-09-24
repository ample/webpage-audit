import type { GetServerSideProps } from 'next';
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSessionId } from '@/lib/session';

import useAudit from '@lib/hooks/useAudit';
import LoadingWithInsights from '@components/LoadingWithInsights';
import MetricsCards, { type MetricDetail } from '@components/MetricsCards';
import Recommendations from '@components/Recommendations';
import MetricModal from '@components/MetricModal';
import TestTimer from '@components/TestTimer';
import SiteFooter from '@components/SiteFooter';
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
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ResultsPage({ testId }: ResultsPageProps) {
  const router = useRouter();

  const [useAiInsights, setUseAiInsights] = useState(true);
  useEffect(() => {
    async function loadAiPreference() {
      try {
        const sessionId = getSessionId();
        const response = await fetch(`/api/session/ai-preference?sessionId=${encodeURIComponent(sessionId)}&testId=${encodeURIComponent(testId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.useAi !== null) {
            setUseAiInsights(data.useAi);
            return;
          }
        }
        // Fallback to localStorage
        const v = localStorage.getItem(`wa:ai:sel:${testId}`);
        if (v === 'true') setUseAiInsights(true);
        else if (v === 'false') setUseAiInsights(false);
      } catch {}
    }

    loadAiPreference();
  }, [testId]);

  const { data, loading, error, statusText, phase, testStartTime, ai, a11y, isHistorical } =
    useAudit(testId, { useAi: useAiInsights });

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

  const loadingLabel = isHistorical
    ? 'Loading saved results…'
    : (phase === 'finished' ? 'Loading results…' : (statusText || 'Running test…'));

  async function handleRetry() {
    if (!data?.siteUrl) return;
    try {
      const { testId: newId } = await runTest(data.siteUrl);
      try {
        const sessionId = getSessionId();
        await fetch(`/api/session/ai-preference?sessionId=${encodeURIComponent(sessionId)}&testId=${encodeURIComponent(newId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ useAi: useAiInsights }),
        }).catch(() => {
          // Fallback to localStorage
          localStorage.setItem(`wa:ai:sel:${newId}`, useAiInsights ? 'true' : 'false');
        });
      } catch {}
      router.push(`/results?testId=${encodeURIComponent(newId)}`);
    } catch {}
  }

  const wptSummaryUrl = data?.summaryUrl || (testId ? `https://www.webpagetest.org/result/${encodeURIComponent(testId)}/` : undefined);
  const wptJsonUrl = data?.jsonUrl || (testId ? `https://www.webpagetest.org/jsonResult.php?test=${encodeURIComponent(testId)}&f=json` : undefined);

  async function exportPdf() {
    if (!data?.metrics) return;

    const payload = {
      data: {
        testId,
        siteUrl: data.siteUrl,
        siteTitle: data.siteTitle,
        runAt: data.runAt,
        summaryUrl: data.summaryUrl,
        jsonUrl: data.jsonUrl,
        metrics: data.metrics,
        a11y: a11y.report ?? null,
        aiSuggestions: useAiInsights ? (ai.suggestions ?? null) : null,
        useAiInsights,
      },
    };

    const fileBase = (() => {
      const host = formatHost(data.siteUrl) || 'site';
      const d = data.runAt ? new Date(data.runAt) : new Date();
      const stamp = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-');
      return `webpage-audit-${host}-${stamp}`;
    })();

    const r = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) return;

    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileBase}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Head>
        <title>{title ? `${title} - Webpage Audit Results` : 'Webpage Audit Results'}</title>
        <meta name="description" content="WebPageTest performance results with actionable insights to make your website load faster" />
      </Head>

      <div className="min-h-screen bg-ample-slate">
        <SiteHeader />

        <main>
          <section className="mx-auto max-w-4xl px-6 pt-12 pb-24 space-y-10">
            {data?.metrics && (
              <div className="rounded-2xl bg-ample-gray p-6 shadow-lg">
                <header className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-100">
                      Results{title ? ` · ${title}` : ''}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-300">
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
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={exportPdf}
                      className="cursor-pointer rounded bg-ample-blue hover:bg-ample-blue/80 px-3 py-1.5 font-semibold text-white shadow  disabled:opacity-60"
                    >
                      Export PDF
                    </button>
                  </div>
                </header>
              </div>
            )}

            {loading && (
              <div className="space-y-3">
                <LoadingWithInsights
                  label={loadingLabel}
                  aiEnabled={useAiInsights}
                  testStartTime={testStartTime}
                />
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
                      className="cursor-pointer rounded bg-gradient-to-r from-yellow-600 to-orange-500 px-3 py-1.5 font-semibold text-white shadow hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
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

                <div className="rounded-2xl bg-ample-gray p-6 shadow-md backdrop-blur">
                  <Recommendations
                    metrics={data.metrics}
                    aiSuggestions={ai.suggestions}
                    aiLoading={ai.loading}
                    aiError={ai.error}
                    useAiInsights={useAiInsights}
                  />
                </div>

                {(a11y.loading || a11y.error || a11y.report) && (
                  <div className="rounded-2xl bg-ample-gray p-6 shadow-md backdrop-blur">
                    {a11y.loading && <div className="text-slate-300">Running accessibility checks…</div>}
                    {a11y.error && <div className="text-rose-300">{a11y.error}</div>}
                    {a11y.report && <A11yPanel report={a11y.report} />}
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
        <SiteFooter />

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
