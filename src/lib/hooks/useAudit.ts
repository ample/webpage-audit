import { useEffect, useRef, useState } from 'react';
import type { Metrics } from '@/pages/api/check-status';

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
      stepIdx.current = Math.min(stepIdx.current + 1, steps.length - 1);
      setMessage(steps[stepIdx.current] || steps[steps.length - 1]);
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

    if (!testId) return;
    setLoading(true);

    let cancelled = false;

    const poll = async (intervalMs: number) => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/check-status?testId=${encodeURIComponent(testId)}`, { cache: 'no-store' });
        const json: StatusPayload = await res.json();
        const p = (json.phase || 'queued') as Phase;

        if (json.siteUrl) setSiteUrl(json.siteUrl);
        if (json.siteTitle) setSiteTitle(json.siteTitle);
        if (json.runAt) setRunAt(json.runAt);

        setMonotonicPhase(p);

        if (p === 'finished' && json.metrics) {
          setMetrics(json.metrics);
          setLoading(false);
          return;
        }
        if (p === 'error') {
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

    poll(2000);

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [testId]);

  const data = metrics && { metrics, siteUrl, siteTitle, runAt };

  return { data, loading, phase, statusText: message, error };
}
