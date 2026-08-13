// Best-effort in-memory rate limiting for the admin login.
//
// State lives in the function instance, so it resets on cold start and is not
// shared across concurrent instances. That is deliberate: it needs no extra
// service and no DB round trip, and it still turns unlimited online password
// guessing into a slow trickle. If this ever needs a hard guarantee, move the
// counters to a shared store.

type Entry = { count: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
// Bounds memory if a flood of distinct keys arrives inside one window.
const MAX_ENTRIES = 1000;

const attempts = new Map<string, Entry>();

function prune(now: number): void {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now || entry.count < MAX_ATTEMPTS) {
    return { allowed: true, retryAfterSec: 0 };
  }

  return {
    allowed: false,
    retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
  };
}

// Only failures count, so a working login is never throttled.
export function recordFailure(key: string): void {
  const now = Date.now();
  prune(now);

  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    if (attempts.size >= MAX_ENTRIES) attempts.clear();
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  entry.count += 1;
}

export function resetRateLimit(key: string): void {
  attempts.delete(key);
}
