import { useEffect, useRef, useState, useCallback } from 'react';
import type { Metrics } from '@/pages/api/check-status';
import { getSessionId } from '@/lib/session';

type Phase = 'queued' | 'running' | 'finished' | 'error';
type StatusPayload = {
  statusCode?: number;
  phase?: Phase;
  metrics?: Metrics;
  error?: string;
  siteUrl?: string;
  siteTitle?: string;
  runAt?: string;
  statusText?: string;
  summaryUrl?: string;
  jsonUrl?: string;
};

const QUEUED_STEPS = ['Waiting for a test agent…', 'Reserving an available browser…'];
const RUNNING_STEPS = [
  'Launching a clean browser…',
  'Fetching the page…',
  'Measuring paint timings…',
  'Collecting network waterfall…',
  'Finalizing results…',
];

const ADVANCE_MS = 4000;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

type NodeRef = { html?: string; target?: string[]; failureSummary?: string };
type A11yViolation = {
  id: string;
  impact?: 'minor' | 'moderate' | 'serious' | 'critical';
  help: string;
  description?: string;
  helpUrl?: string;
  nodes?: NodeRef[];
};

type A11yReport = {
  url: string;
  summary: { violations: number; passes: number; incomplete: number; inapplicable: number };
  violations: A11yViolation[];
  generatedAt: string;
};

type Options = { useAi?: boolean };

export default function useAudit(testId: string | null, options?: Options) {
  const useAi = !!options?.useAi;

  // core data
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [siteUrl, setSiteUrl] = useState<string | undefined>(undefined);
  const [siteTitle, setSiteTitle] = useState<string | undefined>(undefined);
  const [runAt, setRunAt] = useState<string | undefined>(undefined);
  const [summaryUrl, setSummaryUrl] = useState<string | undefined>(undefined);
  const [jsonUrl, setJsonUrl] = useState<string | undefined>(undefined);

  // overall loading & phase
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [error, setError] = useState<string | null>(null);

  // status messages (server + rotating local stepper)
  const [serverStatus, setServerStatus] = useState('');
  const [stepMessage, setStepMessage] = useState('');

  // timers/refs for step rotation
  const pollTimer = useRef<NodeJS.Timeout | null>(null);
  const stepTimer = useRef<NodeJS.Timeout | null>(null);
  const stepIdx = useRef(0);
  const lastPhaseIndex = useRef(0);
  const phaseRef = useRef<Phase | null>(null);

  // test start (for the timer UI)
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);

  // Accessibility state
  const [a11yLoading, setA11yLoading] = useState(false);
  const [a11yError, setA11yError] = useState<string | null>(null);
  const [a11yReport, setA11yReport] = useState<A11yReport | null>(null);

  // Historical flag and a ref mirror to avoid dependency churn
  const [historical, setHistorical] = useState(false);
  const historicalRef = useRef(false);
  useEffect(() => {
    historicalRef.current = historical;
  }, [historical]);

  // --- Stable helpers ---

  const clearTimers = useCallback(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    if (stepTimer.current) clearTimeout(stepTimer.current);
    pollTimer.current = null;
    stepTimer.current = null;
  }, []);

  const setMonotonicPhase = useCallback((p: Phase) => {
    const order = { queued: 0, running: 1, finished: 2, error: 3 } as const;
    const next = order[p];
    if (next >= lastPhaseIndex.current) {
      lastPhaseIndex.current = next;
      setPhase(p);
      phaseRef.current = p;
      stepIdx.current = 0;
    }
  }, []);

  const startStepRotation = useCallback((forPhase: Phase) => {
    if (stepTimer.current) clearTimeout(stepTimer.current);
    const steps = forPhase === 'queued' ? QUEUED_STEPS : RUNNING_STEPS;

    stepIdx.current = 0;
    setStepMessage(steps[0] || '');

    const tick = () => {
      if (phaseRef.current !== forPhase) return;
      if (stepIdx.current >= steps.length - 1) {
        if (forPhase === 'queued') {
          setMonotonicPhase('running');
          return;
        }
        stepTimer.current = setTimeout(tick, ADVANCE_MS);
        return;
      }
      stepIdx.current += 1;
      setStepMessage(steps[stepIdx.current] || steps[steps.length - 1]);
      stepTimer.current = setTimeout(tick, ADVANCE_MS);
    };

    stepTimer.current = setTimeout(tick, ADVANCE_MS);
  }, [setMonotonicPhase]);

  const startPostStepsRotation = useCallback((labels: string[]) => {
    if (stepTimer.current) clearTimeout(stepTimer.current);
    const steps = labels.length ? labels : ['Wrapping up…'];
    stepIdx.current = 0;
    setStepMessage(steps[0]);

    const tick = () => {
      if (stepIdx.current >= steps.length - 1) {
        stepTimer.current = setTimeout(tick, ADVANCE_MS);
        return;
      }
      stepIdx.current += 1;
      setStepMessage(steps[stepIdx.current] || steps[steps.length - 1]);
      stepTimer.current = setTimeout(tick, ADVANCE_MS);
    };

    stepTimer.current = setTimeout(tick, ADVANCE_MS);
  }, []);

  type RecentTest = {
    testId: string;
    url?: string;
    title?: string;
    runAt?: string;
  };

  const saveRecent = useCallback((testId: string, url?: string, title?: string, runAt?: string) => {
    try {
      const sessionId = getSessionId();
      fetch(`/api/session/recent-tests?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, url, title, runAt }),
      }).catch((error) => {
        console.error('Failed to save recent test:', error);
        // Fallback to localStorage
        try {
          const key = 'wa:recent-tests';
          const arr: RecentTest[] = JSON.parse(localStorage.getItem(key) || '[]');
          const next = [{ testId, url, title, runAt }, ...arr.filter((r) => r.testId !== testId)].slice(0, 6);
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
      });
    } catch {}
  }, []);

  // ---- AI fetch with database cache ----
  const fetchAiIfNeeded = useCallback(async (id: string, m: Metrics, url?: string, title?: string) => {
    // Check database cache first
    try {
      const response = await fetch(`/api/ai-insights?testId=${encodeURIComponent(id)}`);
      if (response.ok) {
        const cached = await response.json();
        if (cached.suggestions && Array.isArray(cached.suggestions)) {
          setAiSuggestions(cached.suggestions);
          return;
        }
      }
    } catch {}

    try {
      setAiLoading(true);
      // Generate AI insights via API (which will cache them automatically)
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: id,
          metrics: m,
          siteUrl: url,
          siteTitle: title
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setAiSuggestions(result.suggestions);
      } else {
        throw new Error('AI insights generation failed');
      }
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'AI failed');
    } finally {
      setAiLoading(false);
    }
  }, []);

  // ---- A11y fetch ----
  const fetchA11y = useCallback(async (url: string) => {
    try {
      setA11yLoading(true);
      setA11yError(null);
      const r = await fetch('/api/a11y-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || 'a11y scan failed');
      setA11yReport(json.report as A11yReport);

      // Handle production environment notice
      if (json.notice) {
        console.info('A11y scan notice:', json.notice);
        // You could set this to state if you want to show it in the UI
        // setA11yNotice(json.notice);
      }
    } catch (e: unknown) {
      setA11yError(e instanceof Error ? e.message : 'a11y scan failed');
    } finally {
      setA11yLoading(false);
    }
  }, []);

  // Phase-driven local step text
  useEffect(() => {
    if (phase === 'queued' || phase === 'running') {
      startStepRotation(phase);
    } else if (phase === 'finished') {
      clearTimers();
      setStepMessage('Done');
    } else if (phase === 'error') {
      clearTimers();
      setStepMessage('The test failed');
    }
  }, [phase, startStepRotation, clearTimers]);

  // Main polling effect (uses explicit useAi)
  useEffect(() => {
    // reset for new or existing test load
    clearTimers();
    setMetrics(null);
    setError(null);
    setServerStatus('');
    setStepMessage('');
    setPhase(null);
    phaseRef.current = null;
    lastPhaseIndex.current = 0;
    stepIdx.current = 0;
    setSiteUrl(undefined);
    setSiteTitle(undefined);
    setRunAt(undefined);
    setSummaryUrl(undefined);
    setJsonUrl(undefined);
    setAiSuggestions(null);
    setAiError(null);
    setAiLoading(false);
    setA11yReport(null);
    setA11yError(null);
    setA11yLoading(false);
    setTestStartTime(null);
    setHistorical(false);

    if (!testId) return;

    setTestStartTime(new Date());
    let cancelled = false;

    const poll = async (intervalMs: number, firstHit = false) => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/check-status?testId=${encodeURIComponent(testId)}`, { cache: 'no-store' });
        const json: StatusPayload = await res.json();

        const serverPhase = (json.phase || 'queued') as Phase;
        if (json.siteUrl) setSiteUrl(json.siteUrl);
        if (json.siteTitle) setSiteTitle(json.siteTitle);
        if (json.runAt) setRunAt(json.runAt);
        if (json.summaryUrl) setSummaryUrl(json.summaryUrl);
        if (json.jsonUrl) setJsonUrl(json.jsonUrl);
        if (json.statusText) setServerStatus(json.statusText);

        const needsAi = useAi;
        const needsA11y = true;

        if (firstHit) {
          if (serverPhase === 'finished' && json.metrics) {
            // Historical (finished) test being opened - load results immediately
            setHistorical(true);
            setMetrics(json.metrics);
            setLoading(false);
            clearTimers();
            setStepMessage('Done');
            saveRecent(testId, json.siteUrl, json.siteTitle, json.runAt);

            // Load AI insights and A11y in background (non-blocking)
            if (needsA11y && json.siteUrl) {
              fetchA11y(json.siteUrl).catch(() => {}); // Fire and forget
            }
            if (needsAi) {
              fetchAiIfNeeded(testId, json.metrics, json.siteUrl, json.siteTitle).catch(() => {}); // Fire and forget
            }
            return;
          } else if (serverPhase === 'error') {
            setMonotonicPhase('error');
            setError('Test failed');
            setLoading(false);
            return;
          }
          // Fresh run kicking off
          setLoading(true);
        }

        setMonotonicPhase(serverPhase);

        if (serverPhase === 'finished' && json.metrics) {
          // Show test results immediately
          setMetrics(json.metrics);
          setLoading(false);
          clearTimers();
          setStepMessage('Done');
          saveRecent(testId, json.siteUrl, json.siteTitle, json.runAt);

          // Load AI insights and A11y in background (non-blocking)
          if (needsA11y && json.siteUrl) {
            fetchA11y(json.siteUrl).catch(() => {}); // Fire and forget
          }
          if (needsAi) {
            fetchAiIfNeeded(testId, json.metrics, json.siteUrl, json.siteTitle).catch(() => {}); // Fire and forget
          }
          return;
        }

        if (serverPhase === 'error') {
          setError('Test failed');
          setLoading(false);
          return;
        }

        const next = clamp(intervalMs + 1000, 1000, 6000);
        pollTimer.current = setTimeout(() => poll(next), next);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Polling failed');
          setLoading(false);
        }
      }
    };

    poll(2000, true);

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [
    testId,
    useAi,                 
    clearTimers,
    startPostStepsRotation,
    fetchA11y,
    fetchAiIfNeeded,
    saveRecent,
    setMonotonicPhase,
  ]);

  const combinedStatus = stepMessage || serverStatus || '';

  const data = metrics && { metrics, siteUrl, siteTitle, runAt, summaryUrl, jsonUrl };
  return {
    data,
    loading,
    phase,
    statusText: combinedStatus,
    error,
    testStartTime,
    isHistorical: historical,
    ai: { suggestions: aiSuggestions, loading: aiLoading, error: aiError },
    a11y: { report: a11yReport, loading: a11yLoading, error: a11yError },
  };
}
