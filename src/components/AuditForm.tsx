import { useState } from 'react';
import { runTest } from '@lib/api';

const LOCATIONS = [
  { id: 'ec2-us-east-1:Chrome.Cable', label: 'Desktop · Cable (US-East)' },
  { id: 'ec2-us-east-1:Chrome.4G', label: 'Mobile · 4G (US-East)' },
];

export default function AuditForm({
  disabled,
  onStart,
}: {
  disabled?: boolean;
  onStart(testId: string, useAiInsights?: boolean): void;
}) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [useAiInsights, setUseAiInsights] = useState(false);
  const [location, setLocation] = useState(LOCATIONS[0].id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      setSubmitting(true);
      const { testId } = await runTest(url, location);
      onStart(testId, useAiInsights);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong starting the test');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* URL + submit */}
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
        <input
          type="url"
          id="url"
          required
          disabled={disabled || submitting}
          value={url}
          onChange={(ev) => setUrl(ev.target.value)}
          placeholder="https://example.com"
          className="w-full rounded bg-slate-800/70 ring-1 ring-inset ring-slate-600 px-3 py-2 text-slate-100 placeholder:text-slate-300 focus:outline-none focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={disabled || submitting}
          className="rounded bg-gradient-to-r from-yellow-600 to-orange-500 px-5 py-2 font-semibold text-white text-shadow-lg hover:brightness-105 active:brightness-100 disabled:opacity-60 transition cursor-pointer text-nowrap shadow-lg hover:shadow-yellow-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {submitting ? 'Starting…' : 'Run Audit'}
        </button>
        {err && <p className="text-sm text-rose-400">{err}</p>}
      </form>

      {/* Settings */}
      <div className="space-y-8">
        <fieldset className="rounded-xl border border-slate-800 bg-slate-800/60 p-4">
          <legend className="px-1 text-md font-semibold text-slate-200">Recommendation Source</legend>
          <div>
            <p className="text-sm text-slate-400">
              Choose how site feedback is generated after the test completes.
            </p>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-slate-300">
                <label htmlFor="rec-toggle" className="font-medium text-slate-200">
                  Source
                </label>
                <div className="mt-1 text-xs text-slate-400">
                  {useAiInsights ? 'AI-powered recommendations' : 'WebPageTest rule-based tips'}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className={!useAiInsights ? 'opacity-100' : 'opacity-60'}>WebPageTest</span>
                <button
                  id="rec-toggle"
                  type="button"
                  onClick={() => setUseAiInsights(!useAiInsights)}
                  disabled={disabled || submitting}
                  aria-label={`Switch to ${useAiInsights ? 'WebPageTest' : 'AI-powered'} recommendations`}
                  className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 ${
                    useAiInsights ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useAiInsights ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={useAiInsights ? 'opacity-100' : 'opacity-60'}>AI-powered</span>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Agent */}
        <fieldset className="rounded-xl border border-slate-800 bg-slate-800/60 p-4">
          <legend className="px-1 text-md font-semibold text-slate-200">Test Agent</legend>
          <div>
            <p className="text-sm text-slate-400">
              Select the environment used to run your audit (device/network).
            </p>

            <div className="mt-3 grid gap-4 sm:grid-cols-2 items-center">
              <label className="text-sm text-slate-200" htmlFor="agent-select">
                Agent preset
              </label>
              <select
                id="agent-select"
                className="rounded bg-slate-800/70 ring-1 ring-inset ring-slate-700 px-2 py-2 text-sm text-slate-100 cursor-pointer"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={disabled || submitting}
                aria-label="Test agent selection"
              >
                {LOCATIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
