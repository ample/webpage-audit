import { useState } from 'react';
import { runTest } from '@lib/api';

export default function AuditForm({ disabled, onStart }: { disabled?: boolean; onStart(testId: string): void; }) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    try {
      setSubmitting(true);
      const { testId } = await runTest(url);
      onStart(testId);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong starting the test');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
      <input
        type="url"
        required
        disabled={disabled || submitting}
        value={url}
        onChange={(ev) => setUrl(ev.target.value)}
        placeholder="https://example.com"
        className="w-full rounded bg-slate-800/70 ring-1 ring-inset ring-slate-700 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-sky-500"
      />
      <button
        type="submit"
        disabled={disabled || submitting}
        className="rounded bg-gradient-to-r from-indigo-600 to-sky-500 px-5 py-2 font-medium text-white hover:opacity-90 active:opacity-100 disabled:opacity-60 transition cursor-pointer text-nowrap"
      >
        {submitting ? 'Starting…' : 'Run Audit'}
      </button>
      {err && <p className="text-sm text-rose-400">{err}</p>}
    </form>
  );
}
