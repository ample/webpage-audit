import React from 'react';

interface Metrics {
  ttfbMs: number;
  fcpMs: number;
  lcpMs?: number | null;
  speedIndexMs: number;
  requests: number;
  transferredBytes: number;
}

interface Props {
  metrics: Metrics;
  aiSuggestions?: string[] | null;
  aiLoading?: boolean;
  aiError?: string | null;
  useAiInsights?: boolean;
}

function getWebPageTestRecommendations(metrics: Metrics): string[] {
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

  return recs;
}

export default function Recommendations({ 
  metrics, 
  aiSuggestions, 
  aiLoading, 
  aiError, 
  useAiInsights = false 
}: Props) {
  // If using AI insights
  if (useAiInsights) {
    if (aiError) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">AI-Powered Recommendations</h2>
        <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-amber-200">
          AI insights unavailable right now.
        </div>
      </section>
    );
    }
    
    if (aiLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">AI-Powered Recommendations</h2>
        <div className="text-slate-400">Generating AI insights…</div>
      </section>
    );
    }
    
    if (!aiSuggestions || aiSuggestions.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">AI-Powered Recommendations</h2>
        <div className="text-slate-400">No AI insights available.</div>
      </section>
    );
    }

    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">AI-Powered Recommendations</h2>
        <ul className="space-y-2">
          {aiSuggestions.map((suggestion, i) => (
            <li key={i} className="relative rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-200 shadow-sm">
              <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b from-purple-500 to-indigo-500" />
              <div className="pl-3">{suggestion}</div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  // Default to web page test recommendations
  const recommendations = getWebPageTestRecommendations(metrics);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-100">Rule-Based Recommendations</h2>
      <ul className="space-y-2">
        {recommendations.map((rec, i) => (
          <li
            key={i}
            className="relative rounded-xl border border-slate-700 bg-gradient-to-r from-slate-800 to-slate-800/60 p-3 text-sm text-slate-200 shadow-sm"
          >
            <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b from-indigo-500 to-sky-400" />
            <div className="pl-3">{rec}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
