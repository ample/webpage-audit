import { useRouter } from 'next/router';
import { useState } from 'react';
import AuditForm from '@components/AuditForm';

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Site Audit</h1>
          <p className="text-gray-600">Enter a URL to run a WebPageTest.</p>
        </header>

        <AuditForm
          disabled={busy}
          onStart={(id) => {
            setBusy(true);
            router.push(`/results?testId=${encodeURIComponent(id)}`);
          }}
        />
      </section>
    </main>
  );
}
