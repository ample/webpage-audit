import { useRouter } from 'next/router';
import { useState } from 'react';
import Head from 'next/head';
import AuditForm from '@components/AuditForm';
import SiteHeader from '@components/SiteHeader';

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Head>
        <title>Site Audit - WebPageTest Performance Analysis</title>
        <meta name="description" content="Run WebPageTest performance audits with AI-powered insights and recommendations" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <SiteHeader />
        
        <main>
          <section className="mx-auto max-w-3xl px-6 py-10 space-y-8">
            <header className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-slate-100">Performance Audit</h1>
              <p className="text-slate-400">Enter a URL to run a WebPageTest with optional AI-powered insights.</p>
            </header>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-md">
              <AuditForm
                disabled={busy}
                onStart={(id, useAiInsights) => {
                  setBusy(true);
                  const params = new URLSearchParams({ testId: id });
                  if (useAiInsights) {
                    params.set('ai', 'true');
                  }
                  router.push(`/results?${params.toString()}`);
                }}
              />
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
