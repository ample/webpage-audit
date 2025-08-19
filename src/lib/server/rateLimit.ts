type Key = string;

const hits = new Map<Key, number[]>();

export type RateLimitOptions = {
  windowMs: number;     // e.g., 60_000
  max: number;          // e.g., 5
};

export function rateLimit(key: Key, opts: RateLimitOptions): boolean {
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  const arr = hits.get(key) ?? [];
  const pruned = arr.filter((t) => t > windowStart);
  pruned.push(now);
  hits.set(key, pruned);

  return pruned.length <= opts.max;
}
