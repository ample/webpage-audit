import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSessionId } from '@/lib/session';

type Recent = { testId: string; url?: string; title?: string; runAt?: string };

export default function RecentTests() {
  const [items, setItems] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecentTests() {
      try {
        const sessionId = getSessionId();
        const response = await fetch(`/api/session/recent-tests?sessionId=${encodeURIComponent(sessionId)}`);
        if (response.ok) {
          const data = await response.json();
          setItems(data.recentTests || []);
        }
      } catch (error) {
        console.error('Failed to load recent tests:', error);
        // Fallback to localStorage for backward compatibility
        try {
          const arr: Recent[] = JSON.parse(localStorage.getItem('wa:recent-tests') || '[]');
          setItems(arr);
        } catch {}
      } finally {
        setLoading(false);
      }
    }

    loadRecentTests();
  }, []);

  if (loading) return null;
  if (!items.length) return null;

  return (
    <section className="rounded-2xl bg-ample-gray p-6">
      <h2 className="text-lg font-semibold text-slate-100 mb-3">Recent tests</h2>
      <ul className="space-y-2">
        {items.map((it) => {
          const label = it.title || (it.url ? new URL(it.url).host : it.testId);
          const when = it.runAt ? new Date(it.runAt).toLocaleString() : '';
          return (
            <li key={it.testId} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-slate-200">{label}</div>
                <div className="text-xs text-slate-300 truncate">{it.url}</div>
              </div>
              <div className="flex items-center gap-2">
                {when && <span className="text-xs text-slate-300">{when}</span>}
                <Link
                  href={`/results?testId=${encodeURIComponent(it.testId)}`}
                  className="rounded bg-ample-blue hover:bg-ample-blue/80 px-2 py-1 text-sm text-white "
                >
                  Open
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
