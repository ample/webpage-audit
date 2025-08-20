// lib/hooks/useAudit.ts
import { useEffect, useRef, useState } from 'react';
import type { Metrics } from '@/pages/api/check-status';
import { getAiInsights } from '@lib/api';

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

const QUEUED_STEPS = [
  'Waiting for a test agent…',
  'Reserving an available browser…',
];

const RUNNING_STEPS = [
  'Launching a clean browser…',
  'Fetching the page…',
  'Measuring paint timings…',
  'Collecting network waterfall…',
  'Finalizing results…',
];

const AI_STEPS = [
  'Generating AI insights…',
  'Analyzing performance data…',
  'Crafting recommendations…',
];

const ADVANCE_MS = 4000;

type Recent = { testId: string; url?: string; title?: string; runAt?: string };

function saveRecent(testId: string, url?: string, title?: string, runAt?: string) {
  try {
    const key = 'll:recent-tests';
    const arr: Recent[] = JSON.parse(localStorage.getItem(key) || '[]');
    const next = [{ testId, url, title, runAt }, ...arr.filter((r) => r.testId !== testId)].slice(0, 6);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
}

export default function useAudit(testId: string | null) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);

  // progress state
  const [phase, setPhase] = useState<Phase | null>(null);
  const [stepMessage, setStepMessage] = useState<string>('');     // rotating local steps
  const [serverStatus, setServerStatus] = useState<string>('');    // raw server status (generic)
  const [error, setError] = useState<string | null>(null);

  // metadata
  const [siteUrl, setSiteUrl] = useState<string | undefined>(undefined);
  const [siteTitle, setSiteTitle] = useState<string | undefined>(undefined);
  const [runAt, setRunAt] = useState<string | undefined>(undefined);
  const [summaryUrl, setSummaryUrl] = useState<string | undefined>(undefined);
  const [jsonUrl, setJsonUrl] = useState<string | undefined>(undefined);
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);

  // timers & refs
  const pollTimer = useRef<NodeJS.Timeout | null>(null);
  const stepTimer = useRef<NodeJS.Timeout | null>(null);
  const stepIdx = useRef(0);
  const lastPhaseIndex = useRef(0);
  const phaseRef = useRef<Phase | null>(null);

  function clearTimers() {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    if (stepTimer.current) clearTimeout(stepTimer.current);
    pollTimer.current = null;
    stepTimer.current = null;
  }

  function setMonotonicPhase(p: Phase) {
    const order = { queued: 0, running: 1, finished: 2, error: 3 } as const;
    const next = order[p];
    if (next >= lastPhaseIndex.current) {
      lastPhaseIndex.current = next;
      setPhase(p);
      phaseRef.current = p;
      stepIdx.current = 0;
    }
  }

  function startStepRotation(forPhase: Phase) {
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
  }

  function startAiStepRotation() {
    if (stepTimer.current) clearTimeout(stepTimer.current);
    stepIdx.current = 0;
    setStepMessage(AI_STEPS[0] || '');

    const tick = () => {
      if (stepIdx.current >= AI_STEPS.length - 1) {
        stepTimer.current = setTimeout(tick, ADVANCE_MS);
        return;
      }
      stepIdx.current += 1;
      setStepMessage(AI_STEPS[stepIdx.current] || AI_STEPS[AI_STEPS.length - 1]);
      stepTimer.current = setTimeout(tick, ADVANCE_MS);
    };

    stepTimer.current = setTimeout(tick, ADVANCE_MS);
  }

  useEffect(() => {
    if (phase === 'queued' || phase === 'running') startStepRotation(phase);
    else if (phase === 'finished') {
      clearTimers();
      setStepMessage('Done');
    } else if (phase === 'error') {
      clearTimers();
      setStepMessage('The test failed');
    }
  }, [phase]);

  useEffect(() => {
    // reset for new test
    clearTimers();
    setMetrics(null);
    setError(null);
    setStepMessage('');
    setServerStatus('');
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
    setTestStartTime(null);

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

        if (firstHit) {
          if (serverPhase === 'finished' && json.metrics) {
            setMonotonicPhase('finished');
            setMetrics(json.metrics);
            setLoading(false);
            saveRecent(testId, json.siteUrl, json.siteTitle, json.runAt);
            await fetchAiIfNeeded(testId, json.metrics, json.siteUrl, json.siteTitle);
            return;
          } else if (serverPhase === 'error') {
            setMonotonicPhase('error');
            setError('Test failed');
            setLoading(false);
            return;
          }
          setLoading(true);
        }

        setMonotonicPhase(serverPhase);

        if (serverPhase === 'finished' && json.metrics) {
          setMetrics(json.metrics);
          setLoading(false);
          saveRecent(testId, json.siteUrl, json.siteTitle, json.runAt);
          await fetchAiIfNeeded(testId, json.metrics, json.siteUrl, json.siteTitle);
          return;
        }
        if (serverPhase === 'error') {
          setError('Test failed');
          setLoading(false);
          return;
        }

        const next = Math.min(intervalMs + 1000, 6000);
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
  }, [testId]);

  // AI CACHE: localStorage key helpers
  function aiKey(id: string) {
    return `ll:ai:${id}`;
  }

  async function fetchAiIfNeeded(id: string, m: Metrics, url?: string, title?: string) {
    const params = new URLSearchParams(window.location.search);
    const needsAi = params.get('ai') === 'true';
    if (!needsAi) return;

    // AI CACHE: client-side localStorage check
    try {
      const cached = localStorage.getItem(aiKey(id));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.suggestions)) {
          setAiSuggestions(parsed.suggestions);
          return; // skip network entirely
        }
      }
    } catch {}

    try {
      setAiLoading(true);
      startAiStepRotation(); // non-blocking progress while AI runs
      const suggestions = await getAiInsights(m, url, title, id);
      setAiSuggestions(suggestions);

      // AI CACHE: persist to localStorage
      try {
        localStorage.setItem(aiKey(id), JSON.stringify({ suggestions, at: Date.now() }));
      } catch {}
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'AI failed');
    } finally {
      setAiLoading(false);
      clearTimers();
      setStepMessage('Done');
    }
  }

  // Prefer rotating step message; fall back to server status.
  const combinedStatus = stepMessage || serverStatus || '';

  const data = metrics && { metrics, siteUrl, siteTitle, runAt, summaryUrl, jsonUrl };
  return { data, loading, phase, statusText: combinedStatus, error, testStartTime, ai: { suggestions: aiSuggestions, loading: aiLoading, error: aiError } };
}
