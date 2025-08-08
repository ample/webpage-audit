// components/Recommendations.tsx
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
    recs.push('Improve LCP: optimize hero media (compress/resize), set `fetchpriority="high"` on LCP image, and preconnect to critical origins.');
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
      <h2 className="text-lg font-semibold">Recommendations</h2>
      <ul className="list-inside list-disc space-y-1 text-sm text-gray-800">
        {recs.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </section>
  );
}
