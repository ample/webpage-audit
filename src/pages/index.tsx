import { useRouter } from 'next/router';
import { useState } from 'react';
import Head from 'next/head';
import AuditForm from '@components/AuditForm';
import SiteHeader from '@components/SiteHeader';
import SiteFooter from '@components/SiteFooter';
import RecentTests from '@components/RecentTests';
import { getSessionId } from '@/lib/session';

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Head>
        <title>Webpage Audit - Insights To Make Your Website Lightning Fast</title>
        <meta
          name="description"
          content="Optimize your website's performance with WebPageTest audits and AI-powered recommendations to make your site load at lightning speed"
        />
      </Head>

      <div className="min-h-screen bg-ample-slate">
        <SiteHeader />

        <main>
          <section className="mx-auto max-w-3xl px-6 pt-10 pb-32 space-y-8">
            <header className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-slate-100">
                Is your website <span className="text-orange-200 italic">fast</span> enough?
              </h1>
              <p className="text-slate-300 text-lg">
              Most aren’t. Studies show a one-second delay can slash conversions and search rankings. Our AI-powered audits reveal exactly where you’re losing time — and customers — and how to win them back.
              </p>
            </header>

            <div className="rounded-2xl bg-ample-gray p-6 shadow-md">
              <AuditForm
                disabled={busy}
                onStart={async (id, useAiInsights) => {
                  setBusy(true);
                  try {
                    const sessionId = getSessionId();
                    await fetch(`/api/session/ai-preference?sessionId=${encodeURIComponent(sessionId)}&testId=${encodeURIComponent(id)}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ useAi: useAiInsights }),
                    }).catch(() => {
                      // Fallback to localStorage
                      localStorage.setItem(`wa:ai:sel:${id}`, useAiInsights ? 'true' : 'false');
                    });
                  } catch {}
                  router.push(`/results?testId=${encodeURIComponent(id)}`);
                }}
              />
            </div>

            <RecentTests />
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
