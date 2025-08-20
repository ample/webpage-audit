import { useMemo, useState } from 'react';

type NodeRef = { html?: string; target?: string[]; failureSummary?: string };
type Violation = {
  id: string;
  impact?: 'minor' | 'moderate' | 'serious' | 'critical';
  help: string;
  description?: string;
  helpUrl?: string;
  nodes?: NodeRef[];
};

export type A11yReport = {
  url: string;
  summary: { violations: number; passes: number; incomplete: number; inapplicable: number };
  violations: Violation[];
  generatedAt: string;
};

export default function A11yPanel({ report }: { report: A11yReport }) {
  const [open, setOpen] = useState(false);

  const top = useMemo(() => {
    const order = { critical: 4, serious: 3, moderate: 2, minor: 1 } as const;
    return [...(report.violations || [])]
      .sort((a, b) => (order[b.impact ?? 'minor'] - order[a.impact ?? 'minor']))
      .slice(0, 5);
  }, [report]);

  return (
    <section className="relative rounded-2xl border border-amber-600/30 bg-amber-500/5 p-6 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]">
      <div className="absolute inset-x-0 -top-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-amber-200">Accessibility (beta)</h2>
          <p className="mt-1 text-sm text-amber-200/80">
            Axe-based scan of the tested URL. Focus fixes here to improve real user experience.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 ring-1 ring-inset ring-amber-600/40">
          {report.summary.violations} violations
        </span>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-amber-100/90 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-900/50 p-2 ring-1 ring-inset ring-amber-600/20">
          <div className="text-xs text-amber-300/80">Violations</div>
          <div className="text-lg font-semibold">{report.summary.violations}</div>
        </div>
        <div className="rounded-lg bg-slate-900/50 p-2 ring-1 ring-inset ring-amber-600/20">
          <div className="text-xs text-amber-300/80">Incomplete</div>
          <div className="text-lg font-semibold">{report.summary.incomplete}</div>
        </div>
        <div className="rounded-lg bg-slate-900/50 p-2 ring-1 ring-inset ring-amber-600/20">
          <div className="text-xs text-amber-300/80">Passes</div>
          <div className="text-lg font-semibold">{report.summary.passes}</div>
        </div>
        <div className="rounded-lg bg-slate-900/50 p-2 ring-1 ring-inset ring-amber-600/20">
          <div className="text-xs text-amber-300/80">Inapplicable</div>
          <div className="text-lg font-semibold">{report.summary.inapplicable}</div>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="cursor-pointer text-sm font-medium text-amber-300 underline decoration-dotted underline-offset-4 hover:text-amber-200"
        >
          {open ? 'Hide details' : 'Show top issues'}
        </button>

        {open && (
          <ul className="mt-3 space-y-2">
            {top.map((v) => (
              <li key={v.id} className="rounded-lg border border-amber-600/20 bg-slate-900/50 p-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-amber-100">{v.help}</p>
                  {v.impact && (
                    <span className="ml-3 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300 ring-1 ring-inset ring-amber-600/30">
                      {v.impact}
                    </span>
                  )}
                </div>
                {v.description && <p className="mt-1 text-xs text-amber-200/80">{v.description}</p>}
                <div className="mt-2 text-xs text-amber-300/80">
                  {(v.nodes?.[0]?.failureSummary || v.nodes?.[0]?.html) && (
                    <code className="rounded bg-slate-900/70 px-1.5 py-0.5">{v.nodes?.[0]?.failureSummary || v.nodes?.[0]?.html}</code>
                  )}
                  {v.helpUrl && (
                    <a className="ml-2 text-amber-300 underline decoration-dotted underline-offset-4" href={v.helpUrl} target="_blank" rel="noreferrer">
                      Learn more
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
