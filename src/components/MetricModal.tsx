import React, { useEffect } from 'react';
import type { MetricDetail } from '@components/MetricsCards';

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

function percentTextClass(p: number) {
  if (p >= 1) return 'text-emerald-400';
  if (p >= 0.8) return 'text-green-400';
  if (p >= 0.6) return 'text-amber-400';
  return 'text-rose-400';
}
function percentBgClass(p: number) {
  if (p >= 1) return 'bg-emerald-500';
  if (p >= 0.8) return 'bg-green-500';
  if (p >= 0.6) return 'bg-amber-500';
  return 'bg-rose-500';
}

function RingGaugeLarge({ percent, label }: { percent: number; label: string }) {
  const p = clamp01(percent);
  const size = 140;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * p;
  const color = percentTextClass(p);

  return (
    <div className={`relative inline-block ${color}`} aria-label={`${label} gauge ${Math.round(p * 100)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={stroke} opacity={0.2} fill="none" />
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
      <span className="absolute inset-0 grid place-items-center text-lg font-semibold text-slate-200">
        {Math.round(p * 100)}%
      </span>
    </div>
  );
}

function BarGaugeLarge({ percent, label }: { percent: number; label: string }) {
  const p = clamp01(percent);
  const bg = percentBgClass(p);
  const pct = Math.round(p * 100);
  return (
    <div className="w-full" aria-label={`${label} gauge ${pct}%`}>
      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-700">
        <div className={`h-4 rounded-full ${bg} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-sm text-slate-300">{pct}%</div>
    </div>
  );
}

const TIPS: Record<string, string[]> = {
  TTFB: [
    'Enable CDN/edge caching for HTML where possible',
    'Reduce server work per request (DB/indexing, SSR cost)',
    'Keep TLS session resumption and HTTP/2 on',
  ],
  FCP: [
    'Inline critical CSS; defer non-critical CSS/JS',
    'Preload fonts and the hero image',
    'Minimize render-blocking third-parties',
  ],
  'Speed Index': [
    'Reduce render-blocking resources',
    'Prioritize above-the-fold content',
    'Split bundles; hydrate less above-the-fold',
  ],
  LCP: [
    'Serve a compressed, appropriately sized hero image/video',
    'Use fetchpriority="high" on the LCP image',
    'Preconnect to critical origins',
  ],
  Requests: [
    'Defer/async third-party scripts',
    'Bundle or code-split wisely; lazy-load below the fold',
    'Remove unused libraries/assets',
  ],
  Transferred: [
    'Compress images (AVIF/WebP) and enable Brotli/Gzip',
    'Trim unused CSS/JS and fonts',
    'Audit large JSON or video payloads',
  ],
};

const IMPORTANCE: Record<string, string> = {
  TTFB:
    'Time to First Byte controls how quickly the HTML arrives. Slow TTFB delays everything else—CSS/JS download, rendering, and metrics like FCP and LCP. It often points to server or caching issues.',
  FCP:
    'First Contentful Paint marks the moment users first see something on the page. Faster FCP improves perceived performance and can reduce bounce on slower connections.',
  'Speed Index':
    'Speed Index estimates how quickly the page becomes visually complete. It’s a proxy for the above-the-fold experience and correlates with user-perceived speed.',
  LCP:
    'Largest Contentful Paint measures when the main content becomes visible. It’s a Core Web Vital and is strongly tied to how “fast” the page feels to users.',
  Requests:
    'HTTP Requests add connection overhead and compete for bandwidth/CPU. Too many requests can stall rendering and slow interactivity.',
  Transferred:
    'Transferred Bytes determine how long the network takes to deliver assets. Heavier pages slow initial render, especially on mobile or constrained networks.',
};

const EXPANSIONS: Record<string, string> = {
  TTFB: 'Time to First Byte',
  FCP: 'First Contentful Paint',
  'Speed Index': 'Speed Index',
  LCP: 'Largest Contentful Paint',
  Requests: 'HTTP Requests',
  Transferred: 'Transferred Bytes',
};

function getTips(detail: MetricDetail): string[] {
  const p = clamp01(detail.percent);
  const base = TIPS[detail.label] || [];
  if (detail.pass && p >= 1) {
    return [];
  }
  if (detail.pass && p >= 0.9) {
    return base.slice(0, 2);
  }
  return base;
}

export default function MetricModal({
  detail,
  onClose,
}: {
  detail: MetricDetail | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!detail) return null;

  const p = clamp01(detail.percent);
  const textColor = percentTextClass(p);
  const isBar = detail.label === 'Requests' || detail.label === 'Transferred';
  const tips = getTips(detail);
  const tipsTitle = detail.pass && p >= 0.9 ? 'Optional improvements' : 'What to try';
  const why = IMPORTANCE[detail.label] || '';
  const expansion = EXPANSIONS[detail.label] || detail.label;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/80" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-md p-2 text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer"
          >
            ✕
          </button>

          <h3 className="pr-10 text-2xl font-semibold text-slate-100">{detail.label}</h3>
          <div className="mt-1 text-sm text-slate-300">{expansion}</div>

          <div className="mt-4 flex items-center gap-6">
            <div className="shrink-0">
              {isBar ? (
                <div className="w-56"><BarGaugeLarge percent={detail.percent} label={detail.label} /></div>
              ) : (
                <RingGaugeLarge percent={detail.percent} label={detail.label} />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-3xl font-bold tracking-tight text-slate-100">{detail.rawValue}</div>
              <div className="mt-1 text-sm text-slate-400">Target {detail.idealDisplay}</div>
              <div className={`mt-2 text-sm font-medium ${textColor}`}>{Math.round(p * 100)}% of target</div>
              <span className={`mt-3 inline-flex items-center rounded-full px-2 py-1 text-xs ${detail.pass ? 'bg-emerald-950/50 text-emerald-300 ring-1 ring-inset ring-emerald-800' : 'bg-rose-950/50 text-rose-300 ring-1 ring-inset ring-rose-800'}`}>
                {detail.pass ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-300">{detail.description}</p>
          {why && <p className="mt-3 text-sm text-slate-300">{why}</p>}

          {tips.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-200">{tipsTitle}</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                {tips.map((t, i) => (<li key={i}>{t}</li>))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
