import { useState } from 'react';
import { runTest } from '@lib/api';

export default function AuditForm({ disabled, onStart }: { disabled?: boolean; onStart(testId: string, useAiInsights?: boolean): void; }) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [useAiInsights, setUseAiInsights] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    try {
      setSubmitting(true);
      const { testId } = await runTest(url);
      onStart(testId, useAiInsights);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong starting the test');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* AI Insights Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-slate-200">Recommendation Source</span>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className={useAiInsights ? 'opacity-50' : 'opacity-100'}>Rule-based</span>
            <button
              type="button"
              onClick={() => setUseAiInsights(!useAiInsights)}
              disabled={disabled || submitting}
              aria-label={`Switch to ${useAiInsights ? 'WebPageTest' : 'AI-powered'} recommendations`}
              className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 ${
                useAiInsights ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useAiInsights ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={useAiInsights ? 'opacity-100' : 'opacity-50'}>AI-powered</span>
          </div>
        </div>
      </div>

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
    </div>
  );
}
