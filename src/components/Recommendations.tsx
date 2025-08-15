import React from 'react';

interface Metrics {
  ttfbMs: number;
  fcpMs: number;
  lcpMs?: number | null;
  speedIndexMs: number;
  requests: number;
  transferredBytes: number;
}

type Hints = {
  usesHTTP2?: boolean;
  usesHTTP3?: boolean;
  hasTextCompression?: boolean;
  hasBrotli?: boolean;
  hasLongCacheTTL?: boolean;
  hasPreloadLCP?: boolean;
  hasCriticalCss?: boolean;
  usesNextGenImages?: boolean; // AVIF/WebP
  thirdPartyRequests?: number;
  mainThreadBlockingMs?: number; // TBT-ish
  imageBytes?: number;
  fontBytes?: number;
  scriptBytes?: number;
};

interface Props {
  metrics: Metrics;
  hints?: Partial<Hints>;
  aiSuggestions?: string[] | null;
  aiLoading?: boolean;
  aiError?: string | null;
  useAiInsights?: boolean;
}

function push(recs: string[], ...items: (string | undefined | null | false)[]) {
  for (const i of items) if (i && !recs.includes(i)) recs.push(i);
}

function getWebPageTestRecommendations(metrics: Metrics, hints?: Partial<Hints>): string[] {
  const recs: string[] = [];

  const ttfb = metrics.ttfbMs ?? 0;
  const fcp = metrics.fcpMs ?? 0;
  const lcp = metrics.lcpMs ?? 0;
  const si = metrics.speedIndexMs ?? 0;
  const reqs = metrics.requests ?? 0;
  const bytes = metrics.transferredBytes ?? 0;

  const TTFB_WARN = 800, TTFB_POOR = 1500;
  const FCP_WARN = 1800, FCP_POOR = 3000;
  const LCP_WARN = 2500, LCP_POOR = 4000;
  const SI_WARN = 3400, SI_POOR = 5000;
  const REQ_WARN = 75, REQ_POOR = 150;
  const BYTES_WARN = 2 * 1024 * 1024, BYTES_POOR = 4 * 1024 * 1024;
  const AVG_REQ_WARN = 100 * 1024;
  const THIRD_SHARE_WARN = 0.25, THIRD_SHARE_POOR = 0.4;
  const TBT_WARN = 200, TBT_POOR = 600;

  const avgBytesPerReq = reqs > 0 ? bytes / reqs : 0;
  const thirdParty = Math.max(0, hints?.thirdPartyRequests ?? 0);
  const thirdShare = reqs > 0 ? thirdParty / reqs : 0;

  push(
    recs,
    ttfb > TTFB_POOR && 'Very high TTFB: add a CDN/edge cache, reduce server work, and optimize database calls.',
    ttfb > TTFB_WARN && ttfb <= TTFB_POOR && 'Reduce server TTFB: enable CDN/edge caching and review origin latency.'
  );

  push(
    recs,
    fcp > FCP_POOR && 'Slow FCP: inline critical CSS, defer non-critical JS, and minimize render-blocking resources.',
    fcp > FCP_WARN && fcp <= FCP_POOR && 'Improve FCP: preload key assets (fonts, hero image) and defer non-critical JS.'
  );

  push(
    recs,
    lcp > LCP_POOR && 'Poor LCP: compress/resize hero media, preconnect critical origins, and prioritize the LCP resource.',
    lcp > LCP_WARN && lcp <= LCP_POOR && 'Improve LCP: set fetchpriority="high" on the LCP image and consider preloading it.'
  );

  if (lcp > LCP_WARN && !hints?.hasPreloadLCP) {
    push(recs, 'Preload your LCP resource (image or critical file) to shorten time-to-hero content.');
  }

  push(
    recs,
    si > SI_POOR && 'High Speed Index: reduce above-the-fold blocking, split bundles, and delay non-essential widgets.',
    si > SI_WARN && si <= SI_POOR && 'Lower Speed Index: prioritize critical CSS and prefetch/preconnect critical origins.'
  );

  push(
    recs,
    reqs > REQ_POOR && 'Too many requests: audit and remove unused third-parties, combine small assets, and lazy-load.',
    reqs > REQ_WARN && reqs <= REQ_POOR && 'High request count: defer non-critical scripts and consolidate small files.'
  );

  push(
    recs,
    bytes > BYTES_POOR && 'Very heavy page: compress images (AVIF/WebP), trim unused JS/CSS, and implement code-splitting.',
    bytes > BYTES_WARN && bytes <= BYTES_POOR && 'Cut page weight: enable Brotli/Gzip and optimize large images & fonts.'
  );

  if (avgBytesPerReq > AVG_REQ_WARN) {
    push(recs, 'Large average asset size: split oversized bundles and compress media & text assets more aggressively.');
  }

  if (hints?.scriptBytes && hints.scriptBytes > 800 * 1024) {
    push(recs, 'Excessive JavaScript: split bundles, tree-shake, and defer non-critical scripts to reduce main-thread work.');
  }

  if (hints?.imageBytes && hints.imageBytes > 1 * 1024 * 1024 && !hints?.usesNextGenImages) {
    push(recs, 'Heavy images: convert to AVIF/WebP, serve responsive sizes, and use an image CDN.');
  }

  if (hints?.fontBytes && hints.fontBytes > 200 * 1024) {
    push(recs, 'Heavy web fonts: subset, use font-display: swap, and preload the primary text font.');
  }

  if (hints?.mainThreadBlockingMs && hints.mainThreadBlockingMs > TBT_POOR) {
    push(recs, 'High main-thread blocking: reduce JS execution, defer third-parties, and move heavy work to Web Workers.');
  } else if (hints?.mainThreadBlockingMs && hints.mainThreadBlockingMs > TBT_WARN) {
    push(recs, 'Noticeable main-thread blocking: audit long tasks and delay non-essential script execution.');
  }

  if (thirdShare > THIRD_SHARE_POOR) {
    push(recs, 'Third-party heavy: remove unused tags, load asynchronously, and set strict load conditions/consent gates.');
  } else if (thirdShare > THIRD_SHARE_WARN) {
    push(recs, 'Consider slimming third-parties: lazy-load marketing/analytics after user interaction when possible.');
  }

  if (!(hints?.usesHTTP2 || hints?.usesHTTP3)) {
    push(recs, 'Upgrade to HTTP/2 or HTTP/3 to improve multiplexing and reduce connection overhead.');
  }

  if (!hints?.hasTextCompression && bytes > 300 * 1024) {
    push(recs, 'Enable text compression (Brotli/Gzip) for HTML, CSS, and JS.');
  } else if (hints?.hasBrotli === false) {
    push(recs, 'Prefer Brotli over Gzip where supported for better compression ratios.');
  }

  if (!hints?.hasLongCacheTTL && (reqs > REQ_WARN || bytes > BYTES_WARN)) {
    push(recs, 'Leverage browser caching: set long TTLs for static assets and use content hashing for cache-busting.');
  }

  if (fcp > FCP_WARN && ttfb <= TTFB_WARN) {
    push(recs, 'FCP bottleneck is likely client-side: inline critical CSS and delay non-essential JS to unblock paint.');
  }

  if (lcp > LCP_WARN && fcp <= FCP_WARN) {
    push(recs, 'Optimize hero content delivery: ensure the LCP image is properly sized, compressed, and high-priority.');
  }

  if (!recs.length) {
    push(recs, 'Looks good! Consider adding Core Web Vitals monitoring and performance budgets to maintain quality.');
  } else {
    push(recs, 'Set performance budgets (size, requests, LCP) and monitor regressions in CI.');
  }

  return recs;
}

export default function Recommendations({
  metrics,
  hints,
  aiSuggestions,
  aiLoading,
  aiError,
  useAiInsights = false
}: Props) {
  if (useAiInsights) {
    if (aiError) {
      return (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">Recommendations (AI model)</h2>
          <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-amber-200">
            AI insights unavailable right now.
          </div>
        </section>
      );
    }

    if (aiLoading) {
      return (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">Recommendations (AI model)</h2>
          <div className="text-slate-400">Generating AI insights…</div>
        </section>
      );
    }

    if (!aiSuggestions || aiSuggestions.length === 0) {
      return (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">Recommendations (AI model)</h2>
          <div className="text-slate-400">No AI insights available.</div>
        </section>
      );
    }

    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">Recommendations (AI model)</h2>
        <ul className="space-y-2">
          {aiSuggestions.map((suggestion, i) => (
            <li
              key={i}
              className="relative rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-200 shadow-sm"
            >
              <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b from-slate-500 to-slate-600" />
              <div className="pl-3">{suggestion}</div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const recommendations = getWebPageTestRecommendations(metrics, hints);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-100">
        Recommendations (WebPageTest rules — no AI)
      </h2>
      <ul className="space-y-2">
        {recommendations.map((rec, i) => (
          <li
            key={i}
            className="relative rounded-xl border border-slate-700 bg-gradient-to-r from-slate-800 to-slate-800/60 p-3 text-sm text-slate-200 shadow-sm"
          >
            <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b from-slate-600 to-slate-700" />
            <div className="pl-3">{rec}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
