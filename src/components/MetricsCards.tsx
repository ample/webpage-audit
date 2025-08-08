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
  'TTFB': 'Time to First Byte: how quickly your server starts responding. Lower is better.',
  'FCP': 'First Contentful Paint: time until the first content appears. Lower is better.',
  'Speed Index': 'How quickly the page visually appears complete. Lower is better.',
  'LCP': 'Largest Contentful Paint: time for the main content to appear. Lower is better.',
  'Requests': 'Number of files requested during load. Fewer is generally better.',
  'Transferred': 'Total bytes transferred during initial load. Smaller is better.',
};

function badgeColor(pass: boolean) {
  return pass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
}

export default function MetricsCards({ metrics }: Props) {
  const ttfb = metrics.ttfbMs, fcp = metrics.fcpMs, si = metrics.speedIndexMs, lcp = metrics.lcpMs ?? null;
  const req = metrics.requests, mb = metrics.transferredBytes / 1024 / 1024;

  const items = [
    { label: 'TTFB', value: `${(ttfb/1000).toFixed(2)} s`, pass: ttfb <= 800 },
    { label: 'FCP', value: `${(fcp/1000).toFixed(2)} s`, pass: fcp <= 1800 },
    { label: 'Speed Index', value: `${(si/1000).toFixed(2)} s`, pass: si <= 3400 },
    ...(lcp !== null ? [{ label: 'LCP', value: `${(lcp/1000).toFixed(2)} s`, pass: lcp <= 2500 }] : []),
    { label: 'Requests', value: String(req), pass: req <= 75 },
    { label: 'Transferred', value: `${mb.toFixed(2)} MB`, pass: mb <= 2 },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Key Metrics</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.label} className="rounded border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <Tooltip label={DESCRIPTIONS[it.label] || ''}>
                <p className="text-sm text-gray-600 underline decoration-dotted underline-offset-4">
                  {it.label}
                </p>
              </Tooltip>
              <span className={`rounded px-2 py-0.5 text-xs ${badgeColor(it.pass)}`}>
                {it.pass ? 'Pass' : 'Needs Attention'}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold">{it.value}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Reference: onLoad {(metrics.onLoadMs/1000).toFixed(2)}s, Fully Loaded {(metrics.fullyLoadedMs/1000).toFixed(2)}s.
      </p>
    </section>
  );
}
