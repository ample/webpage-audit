import React from 'react';

interface Metrics {
  ttfbMs: number;
  fcpMs: number;
  lcpMs?: number | null;
  speedIndexMs: number;
  requests: number;
  transferredBytes: number;
}
interface Props { metrics: Metrics; }

export default function Recommendations({ metrics }: Props) {
  const recs: string[] = [];

  if (metrics.ttfbMs > 800) {
    recs.push('Reduce server TTFB: enable caching (CDN, edge cache), optimize server rendering, and review origin latency.');
  }
  if (metrics.fcpMs > 1800) {
    recs.push('Improve FCP: inline critical CSS, defer non-critical JS, preload key assets (fonts, hero image).');
  }
  if ((metrics.lcpMs ?? 0) > 2500) {
    recs.push('Improve LCP: optimize hero media (compress/resize), set fetchpriority="high" on the LCP image, and preconnect to critical origins.');
  }
  if (metrics.speedIndexMs > 3400) {
    recs.push('Lower Speed Index: reduce render-blocking resources, split bundles, and prioritize above-the-fold content.');
  }
  if (metrics.requests > 75) {
    recs.push('Reduce request count: combine assets where sensible, defer 3rd-parties, and lazy-load below-the-fold scripts.');
  }
  if (metrics.transferredBytes > 2 * 1024 * 1024) {
    recs.push('Cut page weight: compress images (AVIF/WebP), enable brotli/gzip, and trim unused CSS/JS.');
  }

  if (!recs.length) {
    recs.push('Looks good! Consider adding Core Web Vitals monitoring for ongoing assurance.');
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Recommendations</h2>
      <ul className="space-y-2">
        {recs.map((r, i) => (
          <li
            key={i}
            className="relative rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 text-sm text-gray-800 shadow-sm"
          >
            <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b from-indigo-500 to-sky-400" />
            <div className="pl-3">{r}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
