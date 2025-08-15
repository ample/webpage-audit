import { useRouter } from 'next/router';
import { useState } from 'react';
import AuditForm from '@components/AuditForm';

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-100">Site Audit</h1>
          <p className="text-slate-400">Enter a URL to run a WebPageTest.</p>
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
  );
}
