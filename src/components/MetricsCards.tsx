// components/MetricsCards.tsx
import React from 'react';
import Tooltip from '@components/Tooltip';

interface Metrics {
  ttfbMs: number;
  fcpMs: number;
  speedIndexMs: number;
  lcpMs?: number | null;
  requests: number;
  transferredBytes: number;
  onLoadMs: number;
  fullyLoadedMs: number;
}
interface Props { metrics: Metrics; }

const DESCRIPTIONS: Record<string, string> = {
  TTFB: 'Time to First Byte: how quickly your server starts responding. Lower is better.',
  FCP: 'First Contentful Paint: time until the first content appears. Lower is better.',
  'Speed Index': 'How quickly the page visually appears complete. Lower is better.',
  LCP: 'Largest Contentful Paint: time for the main content to appear. Lower is better.',
  Requests: 'Number of files requested during load. Fewer is generally better.',
  Transferred: 'Total bytes transferred during initial load. Smaller is better.',
};

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

// Text color (used by RingGauge where SVG stroke uses currentColor)
function percentTextClass(p: number) {
  if (p >= 1) return 'text-emerald-600';
  if (p >= 0.8) return 'text-green-600';
  if (p >= 0.6) return 'text-amber-500';
  return 'text-rose-600';
}

// Background color (used by BarGauge fill)
function percentBgClass(p: number) {
  if (p >= 1) return 'bg-emerald-500';
  if (p >= 0.8) return 'bg-green-500';
  if (p >= 0.6) return 'bg-amber-500';
  return 'bg-rose-500';
}

function badgeClasses(pass: boolean) {
  return pass
    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200'
    : 'bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200';
}

function RingGauge({
  percent,
  size = 72,
  stroke = 8,
  label,
}: { percent: number; size?: number; stroke?: number; label: string; }) {
  const p = clamp01(percent);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * p;
  const color = percentTextClass(p);

  return (
    <div className={`relative inline-block ${color}`} aria-label={`${label} gauge ${Math.round(p * 100)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={stroke} opacity={0.15} fill="none" />
        <circle
          cx={size/2}
          cy={size/2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-semibold text-gray-900">
        {Math.round(p * 100)}%
      </span>
    </div>
  );
}

function BarGauge({ percent, label }: { percent: number; label: string; }) {
  const p = clamp01(percent);
  const bg = percentBgClass(p);
  const pct = Math.round(p * 100);

  return (
    <div className="w-full" aria-label={`${label} gauge ${pct}%`}>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-3 rounded-full ${bg} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-500">{pct}%</div>
    </div>
  );
}

export default function MetricsCards({ metrics }: Props) {
  const ttfb = metrics.ttfbMs;
  const fcp = metrics.fcpMs;
  const si = metrics.speedIndexMs;
  const lcp = metrics.lcpMs ?? null;
  const req = metrics.requests;
  const mb = metrics.transferredBytes / 1024 / 1024;

  // Targets (meeting target => 100%)
  const ideals = {
    TTFB: 800,
    FCP: 1800,
    'Speed Index': 3400,
    LCP: 2500,
    Requests: 75,
    Transferred: 2, // MB
  };

  const items = [
    {
      key: 'TTFB',
      label: 'TTFB',
      rawValue: `${(ttfb / 1000).toFixed(2)} s`,
      idealDisplay: '≤ 0.80s',
      percent: ttfb > 0 ? ideals.TTFB / ttfb : 1,
      pass: ttfb <= ideals.TTFB,
      gauge: <RingGauge percent={ttfb > 0 ? ideals.TTFB / ttfb : 1} label="TTFB" />,
    },
    {
      key: 'FCP',
      label: 'FCP',
      rawValue: `${(fcp / 1000).toFixed(2)} s`,
      idealDisplay: '≤ 1.80s',
      percent: fcp > 0 ? ideals.FCP / fcp : 1,
      pass: fcp <= ideals.FCP,
      gauge: <RingGauge percent={fcp > 0 ? ideals.FCP / fcp : 1} label="FCP" />,
    },
    {
      key: 'Speed Index',
      label: 'Speed Index',
      rawValue: `${(si / 1000).toFixed(2)} s`,
      idealDisplay: '≤ 3.40s',
      percent: si > 0 ? ideals['Speed Index'] / si : 1,
      pass: si <= ideals['Speed Index'],
      gauge: <RingGauge percent={si > 0 ? ideals['Speed Index'] / si : 1} label="Speed Index" />,
    },
    ...(lcp !== null ? [{
      key: 'LCP',
      label: 'LCP',
      rawValue: `${(lcp / 1000).toFixed(2)} s`,
      idealDisplay: '≤ 2.50s',
      percent: lcp > 0 ? ideals.LCP / lcp : 1,
      pass: lcp <= ideals.LCP,
      gauge: <RingGauge percent={lcp > 0 ? ideals.LCP / lcp : 1} label="LCP" />,
    }] : []),
    {
      key: 'Requests',
      label: 'Requests',
      rawValue: String(req),
      idealDisplay: '≤ 75',
      percent: req > 0 ? ideals.Requests / req : 1,
      pass: req <= ideals.Requests,
      gauge: <BarGauge percent={req > 0 ? ideals.Requests / req : 1} label="Requests" />,
    },
    {
      key: 'Transferred',
      label: 'Transferred',
      rawValue: `${mb.toFixed(2)} MB`,
      idealDisplay: '≤ 2.00MB',
      percent: mb > 0 ? ideals.Transferred / mb : 1,
      pass: mb <= ideals.Transferred,
      gauge: <BarGauge percent={mb > 0 ? ideals.Transferred / mb : 1} label="Transferred" />,
    },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-gray-900">Key Metrics</h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const p = clamp01(it.percent);
          const textColor = percentTextClass(p);
          return (
            <div
              key={it.key}
              className="group relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-indigo-500/0 via-sky-400/0 to-blue-400/0 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-30" />
              <div className="flex items-start justify-between">
                <Tooltip label={DESCRIPTIONS[it.label] || ''}>
                  <p className="text-sm font-medium text-gray-700 underline decoration-dotted underline-offset-4">
                    {it.label}
                  </p>
                </Tooltip>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${badgeClasses(it.pass)}`}>
                  {it.pass ? 'Pass' : 'Needs Attention'}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-4">
                {/* Gauge */}
                <div className="shrink-0 w-20 flex justify-center">{it.gauge}</div>

                {/* Numbers */}
                <div className="min-w-0">
                  <div className="text-3xl font-bold tracking-tight text-gray-900">{it.rawValue}</div>
                  <div className="mt-1 text-xs text-gray-500">Target {it.idealDisplay}</div>
                  <div className={`mt-2 text-xs font-medium ${textColor}`}>
                    {Math.round(p * 100)}% of target
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-gray-600">
        Reference:&nbsp;
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
          onLoad {(metrics.onLoadMs / 1000).toFixed(2)}s
        </span>
        <span className="mx-2 text-gray-300">•</span>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
          Fully Loaded {(metrics.fullyLoadedMs / 1000).toFixed(2)}s
        </span>
      </p>
    </section>
  );
}
