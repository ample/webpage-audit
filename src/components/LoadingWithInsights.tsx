import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  label?: string;
  aiEnabled?: boolean;
  testStartTime?: Date | null;
}

const PERFORMANCE_INSIGHTS = [
  {
    title: "First Impressions Matter",
    stat: "47% of users expect a page to load in 2 seconds or less",
    detail: "Slow loading times directly impact bounce rates and conversions."
  },
  {
    title: "Mobile Performance is Critical",
    stat: "53% of mobile users abandon sites that take over 3 seconds to load",
    detail: "Mobile performance directly affects search rankings and user retention."
  },
  {
    title: "Core Web Vitals Impact SEO",
    stat: "Google uses page experience signals as ranking factors",
    detail: "LCP, FID, and CLS scores affect your search engine visibility."
  },
  {
    title: "Speed Drives Conversions",
    stat: "A 1-second delay in page load time can reduce conversions by 7%",
    detail: "Every millisecond counts when it comes to user engagement."
  },
  {
    title: "Image Optimization Wins",
    stat: "Images account for 60% of the average page's total bytes",
    detail: "Properly optimized images can dramatically improve load times."
  }
];

const ACCESSIBILITY_INSIGHTS = [
  {
    title: "Accessibility is Business Critical",
    stat: "15% of the global population lives with some form of disability",
    detail: "Making your site accessible opens it to a significant market segment."
  },
  {
    title: "Legal Requirements Matter",
    stat: "Web accessibility lawsuits increased by 320% in recent years",
    detail: "ADA compliance isn't just good practice—it's often legally required."
  },
  {
    title: "Alt Text Improves SEO",
    stat: "Descriptive alt text helps search engines understand your content",
    detail: "Accessibility improvements often boost search engine rankings."
  },
  {
    title: "Keyboard Navigation is Essential",
    stat: "Many users rely on keyboards instead of mice for navigation",
    detail: "Proper focus management improves usability for all users."
  },
  {
    title: "Color Contrast Affects Everyone",
    stat: "8% of men and 0.5% of women have some form of color blindness",
    detail: "High contrast text is easier to read for everyone, especially in bright light."
  }
];

export default function LoadingWithInsights({ label, aiEnabled }: Props) {
  const [currentInsight, setCurrentInsight] = useState(0);
  const [insights] = useState(() => {
    // Shuffle and combine insights for variety
    const allInsights = [...PERFORMANCE_INSIGHTS, ...ACCESSIBILITY_INSIGHTS];
    return allInsights.sort(() => Math.random() - 0.5);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentInsight(prev => (prev + 1) % insights.length);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [insights.length]);

  const insight = insights[currentInsight];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LoadingSpinner label={label} />
        {aiEnabled && (
          <span className="inline-flex items-center rounded-full bg-blue-900/40 px-2.5 py-1 text-xs font-medium text-blue-200 ring-1 ring-inset ring-blue-700/60">
            AI recommendations enabled
          </span>
        )}
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-2 h-2 bg-ample-blue rounded-full mt-2"></div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm mb-1">{insight.title}</h3>
            <p className="text-ample-light-blue font-semibold text-sm mb-1">{insight.stat}</p>
            <p className="text-gray-300 text-xs leading-relaxed">{insight.detail}</p>
          </div>
        </div>

        <div className="mt-3 flex justify-center">
          <div className="flex gap-1">
            {insights.slice(0, 8).map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === currentInsight % 8 ? 'bg-ample-blue' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}