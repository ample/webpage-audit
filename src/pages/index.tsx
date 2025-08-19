import { useRouter } from 'next/router';
import { useState } from 'react';
import Head from 'next/head';
import AuditForm from '@components/AuditForm';
import SiteHeader from '@components/SiteHeader';
import RecentTests from '@components/RecentTests';

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Head>
        <title>Lightning Load - Insights To Make Your Website Lightning Fast</title>
        <meta name="description" content="Optimize your website's performance with WebPageTest audits and AI-powered recommendations to make your site load at lightning speed" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <SiteHeader />

        <main>
          <section className="mx-auto max-w-3xl px-6 pt-10 pb-32 space-y-8">
            <header className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-slate-100">Insights To Make Your Website <span className="text-orange-200">Lightning Fast</span></h1>
              <p className="text-slate-300 text-lg">Run a WebPageTest-powered site audit and get actionable AI recommendations to make it load at lightning speed.</p>
            </header>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-md">
              <AuditForm
                disabled={busy}
                onStart={(id, useAiInsights) => {
                  setBusy(true);
                  const params = new URLSearchParams({ testId: id });
                  if (useAiInsights) params.set('ai', 'true');
                  router.push(`/results?${params.toString()}`);
                }}
              />
            </div>

            <RecentTests />
          </section>
        </main>
      </div>
    </>
  );
}
