// src/lib/server/cache.ts
// Minimal server-only TTL cache with in-flight request coalescing.
// Note: per-process, ephemeral. Good for our size + cost goals.

type Entry<T> = { value: T; exp: number };

const store = new Map<string, Entry<any>>();
const inflight = new Map<string, Promise<any>>();

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

export function getCache<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.exp <= nowSec()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function setCache<T>(key: string, value: T, ttlSeconds: number) {
  store.set(key, { value, exp: nowSec() + Math.max(1, ttlSeconds) });
}

export function delCache(key: string) {
  store.delete(key);
}

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = getCache<T>(key);
  if (cached !== null) return cached;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const p = (async () => {
    try {
      const value = await loader();
      setCache(key, value, ttlSeconds);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}
