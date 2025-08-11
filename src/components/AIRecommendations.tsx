import React from 'react';

export default function AIRecommendations({ suggestions, loading, error }: { suggestions: string[] | null; loading: boolean; error: string | null; }) {
  if (error) {
    return <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-amber-200">AI insights unavailable right now.</div>;
  }
  if (loading) {
    return <div className="text-slate-400">Generating AI insights…</div>;
  }
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-100">AI Insights</h2>
      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li key={i} className="relative rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-200 shadow-sm">
            <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b from-purple-500 to-indigo-500" />
            <div className="pl-3">{s}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
