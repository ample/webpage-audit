import { useMemo } from 'react';

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

type Impact = NonNullable<Violation['impact']>;

const IMPACT_STYLES: Record<
  Impact,
  {
    itemBorder: string;
    chipBg: string;
    chipText: string;
    chipRing: string;
  }
> = {
  critical: {
    itemBorder: 'border-rose-600/30',
    chipBg: 'bg-rose-500/10',
    chipText: 'text-rose-300',
    chipRing: 'ring-rose-600/30',
  },
  serious: {
    itemBorder: 'border-red-600/30',
    chipBg: 'bg-red-500/10',
    chipText: 'text-red-300',
    chipRing: 'ring-red-600/30',
  },
  moderate: {
    itemBorder: 'border-orange-600/30',
    chipBg: 'bg-orange-500/10',
    chipText: 'text-orange-300',
    chipRing: 'ring-orange-600/30',
  },
  minor: {
    itemBorder: 'border-yellow-600/30',
    chipBg: 'bg-yellow-500/10',
    chipText: 'text-yellow-300',
    chipRing: 'ring-yellow-600/30',
  },
};

const classesFor = (impact?: Violation['impact']) => IMPACT_STYLES[impact ?? 'minor'];

export default function A11yPanel({ report }: { report: A11yReport }) {
  const top = useMemo(() => {
    const order = { critical: 4, serious: 3, moderate: 2, minor: 1 } as const;
    return [...(report.violations || [])]
      .sort((a, b) => order[b.impact ?? 'minor'] - order[a.impact ?? 'minor'])
      .slice(0, 5);
  }, [report]);

  return (
    <section className="relative rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-sm">
      <div className="absolute inset-x-0 -top-1 h-px bg-gradient-to-r from-transparent via-slate-500/40 to-transparent" />
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Accessibility Recommendations</h2>
          <p className="mt-1 text-sm text-slate-300">
            Axe-based scan of the tested URL. Focus fixes here to improve real user experience.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200 ring-1 ring-inset ring-slate-700">
          {report.summary.violations} violations
        </span>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-200 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-900/50 p-2 ring-1 ring-inset ring-slate-700">
          <div className="text-xs text-slate-400">Violations</div>
          <div className="text-lg font-semibold text-slate-100">{report.summary.violations}</div>
        </div>
        <div className="rounded-lg bg-slate-900/50 p-2 ring-1 ring-inset ring-slate-700">
          <div className="text-xs text-slate-400">Incomplete</div>
          <div className="text-lg font-semibold text-slate-100">{report.summary.incomplete}</div>
        </div>
        <div className="rounded-lg bg-slate-900/50 p-2 ring-1 ring-inset ring-slate-700">
          <div className="text-xs text-slate-400">Passes</div>
          <div className="text-lg font-semibold text-slate-100">{report.summary.passes}</div>
        </div>
        <div className="rounded-lg bg-slate-900/50 p-2 ring-1 ring-inset ring-slate-700">
          <div className="text-xs text-slate-400">Inapplicable</div>
          <div className="text-lg font-semibold text-slate-100">{report.summary.inapplicable}</div>
        </div>
      </div>

      <div className="mt-6">
        <ul className="mt-3 space-y-2">
          {top.map((v) => {
            const c = classesFor(v.impact);
            return (
              <li key={v.id} className={`rounded-lg border ${c.itemBorder} bg-slate-900/60 p-3`}>
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-slate-100">{v.help}</p>
                  {v.impact && (
                    <span
                      className={`ml-3 inline-flex items-center rounded-full ${c.chipBg} px-2 py-0.5 text-xs ${c.chipText} ring-1 ring-inset ${c.chipRing}`}
                    >
                      {v.impact}
                    </span>
                  )}
                </div>
                {v.description && <p className="mt-1 text-xs text-slate-300">{v.description}</p>}
                <div className="mt-2 text-xs text-slate-300">
                  {(v.nodes?.[0]?.failureSummary || v.nodes?.[0]?.html) && (
                    <code className="rounded bg-slate-800 px-1.5 py-0.5">
                      {v.nodes?.[0]?.failureSummary || v.nodes?.[0]?.html}
                    </code>
                  )}
                  {v.helpUrl && (
                    <a
                      className="ml-2 text-slate-300 underline decoration-dotted underline-offset-4 hover:text-slate-200"
                      href={v.helpUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Learn more
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
