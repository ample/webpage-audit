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

export default function useAudit(testId: string | null) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState<string | undefined>(undefined);
  const [siteTitle, setSiteTitle] = useState<string | undefined>(undefined);
  const [runAt, setRunAt] = useState<string | undefined>(undefined);
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);

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
    setMessage(steps[0] || '');

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
      setMessage(steps[stepIdx.current] || steps[steps.length - 1]);
      stepTimer.current = setTimeout(tick, ADVANCE_MS);
    };

    stepTimer.current = setTimeout(tick, ADVANCE_MS);
  }

  function startAiStepRotation() {
    if (stepTimer.current) clearTimeout(stepTimer.current);

    stepIdx.current = 0;
    setMessage(AI_STEPS[0] || '');

    const tick = () => {
      if (stepIdx.current >= AI_STEPS.length - 1) {
        stepTimer.current = setTimeout(tick, ADVANCE_MS);
        return;
      }

      stepIdx.current += 1;
      setMessage(AI_STEPS[stepIdx.current] || AI_STEPS[AI_STEPS.length - 1]);
      stepTimer.current = setTimeout(tick, ADVANCE_MS);
    };

    stepTimer.current = setTimeout(tick, ADVANCE_MS);
  }

  useEffect(() => {
    if (phase === 'queued') startStepRotation('queued');
    else if (phase === 'running') startStepRotation('running');
    else if (phase === 'finished') {
      clearTimers();
      setMessage('Done');
    } else if (phase === 'error') {
      clearTimers();
      setMessage('The test failed');
    }
  }, [phase]);

  useEffect(() => {
    // reset for new test
    clearTimers();
    setMetrics(null);
    setError(null);
    setMessage('');
    setPhase(null);
    phaseRef.current = null;
    lastPhaseIndex.current = 0;
    stepIdx.current = 0;
    setSiteUrl(undefined);
    setSiteTitle(undefined);
    setRunAt(undefined);

    setAiSuggestions(null);
    setAiError(null);
    setAiLoading(false);
    setTestStartTime(null);

    if (!testId) return;

    // Set test start time when we begin polling
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

        if (firstHit) {
          if (serverPhase === 'finished' && json.metrics) {
            setMonotonicPhase('finished');
            
            // Check if we need AI insights based on URL params
            const urlParams = new URLSearchParams(window.location.search);
            const needsAiInsights = urlParams.get('ai') === 'true';
            
            if (needsAiInsights) {
              // Keep loading until AI insights are ready - don't set metrics yet
              startAiStepRotation();
              try {
                setAiLoading(true);
                const suggestions = await getAiInsights(json.metrics, json.siteUrl, json.siteTitle);
                if (!cancelled) {
                  setAiSuggestions(suggestions);
                  setMetrics(json.metrics); // Set metrics only after AI is done
                  setLoading(false);
                  clearTimers();
                  setMessage('Done');
                }
              } catch (e: unknown) {
                if (!cancelled) {
                  setAiError(e instanceof Error ? e.message : 'AI failed');
                  setMetrics(json.metrics); // Set metrics even if AI fails
                  setLoading(false);
                  clearTimers();
                  setMessage('Done');
                }
              } finally {
                if (!cancelled) setAiLoading(false);
              }
            } else {
              // No AI needed, set metrics and stop loading immediately
              setMetrics(json.metrics);
              setLoading(false);
              setMessage('Done');
            }
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
          // Check if we need AI insights based on URL params
          const urlParams = new URLSearchParams(window.location.search);
          const needsAiInsights = urlParams.get('ai') === 'true';
          
          if (needsAiInsights) {
            // Keep loading until AI insights are ready - don't set metrics yet
            startAiStepRotation();
            try {
              setAiLoading(true);
              const suggestions = await getAiInsights(json.metrics, json.siteUrl, json.siteTitle);
              if (!cancelled) {
                setAiSuggestions(suggestions);
                setMetrics(json.metrics); // Set metrics only after AI is done
                setLoading(false);
                clearTimers();
                setMessage('Done');
              }
            } catch (e: unknown) {
              if (!cancelled) {
                setAiError(e instanceof Error ? e.message : 'AI failed');
                setMetrics(json.metrics); // Set metrics even if AI fails
                setLoading(false);
                clearTimers();
                setMessage('Done');
              }
            } finally {
              if (!cancelled) setAiLoading(false);
            }
          } else {
            // No AI needed, set metrics and stop loading immediately
            setMetrics(json.metrics);
            setLoading(false);
          }

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

  const data = metrics && { metrics, siteUrl, siteTitle, runAt };

  return { data, loading, phase, statusText: message, error, testStartTime, ai: { suggestions: aiSuggestions, loading: aiLoading, error: aiError } };
}
