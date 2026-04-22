const STORAGE_KEY = "seen_posts";
const MAX_SEEN = 1;
const TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

interface SeenEntry {
  slug: string;
  ts: number;
}

function read(): SeenEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((x): SeenEntry[] =>
      x && typeof x === "object" && typeof x.slug === "string" && typeof x.ts === "number"
        ? [{ slug: x.slug, ts: x.ts }]
        : []
    );
  } catch {
    return [];
  }
}

function write(entries: SeenEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota/security errors
  }
}

export function getSeenSlugs(): string[] {
  const cutoff = Date.now() - TTL_MS;
  const fresh = read().filter((e) => e.ts >= cutoff);
  // Prune stale entries from storage opportunistically.
  if (fresh.length !== read().length) write(fresh);
  return fresh.slice(0, MAX_SEEN).map((e) => e.slug);
}

export function recordVisit(slug: string): void {
  if (typeof window === "undefined") return;
  const cutoff = Date.now() - TTL_MS;
  const current = read()
    .filter((e) => e.ts >= cutoff && e.slug !== slug);
  current.unshift({ slug, ts: Date.now() });
  write(current.slice(0, MAX_SEEN));
}
