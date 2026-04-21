"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type Fuse from "fuse.js";

type IndexEntry = {
  title: string;
  slug: string;
  description: string | null;
  tags: string[];
};

const FUSE_OPTIONS = {
  keys: [
    { name: "title", weight: 0.7 },
    { name: "tags", weight: 0.2 },
    { name: "description", weight: 0.1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
};

export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const fuseRef = useRef<Fuse<IndexEntry> | null>(null);
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IndexEntry[]>([]);

  // Lazy-load Fuse + index the first time the overlay opens.
  useEffect(() => {
    if (!open || fuseRef.current) return;
    let cancelled = false;
    (async () => {
      const [{ default: FuseCtor }, res] = await Promise.all([
        import("fuse.js"),
        fetch("/api/search/index"),
      ]);
      if (cancelled) return;
      const data = await res.json();
      fuseRef.current = new FuseCtor<IndexEntry>(data.posts, FUSE_OPTIONS);
      setIndexLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Focus the input on open, blur/clear on close.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Lock body scroll while overlay is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Run fuzzy search whenever the query changes.
  useEffect(() => {
    const q = query.trim();
    if (!q || !fuseRef.current) {
      setResults([]);
      return;
    }
    setResults(
      fuseRef.current
        .search(q, { limit: 10 })
        .map((r) => r.item)
    );
  }, [query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    onClose();
  };

  const hasQuery = query.trim().length > 0;
  const showNoResults = useMemo(
    () => hasQuery && indexLoaded && results.length === 0,
    [hasQuery, indexLoaded, results.length]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background md:bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="absolute inset-x-0 top-0 bg-background md:left-1/2 md:top-10 md:inset-x-auto md:w-full md:max-w-[800px] md:-translate-x-1/2 md:rounded-lg md:shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="flex items-center gap-2 p-3 md:border-b md:p-3">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-muted px-4 py-2 md:rounded-md md:bg-transparent md:px-0 md:py-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search trip reports…"
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-lg"
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </form>

        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
          {!hasQuery && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Start typing to search by title, tag, or description.
            </p>
          )}

          {showNoResults && (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No quick matches. Press Enter to search the full text of all posts.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <ul className="divide-y">
              {results.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/posts/${r.slug}`}
                    onClick={onClose}
                    className="block py-3 hover:bg-muted/60 -mx-2 px-2 rounded"
                  >
                    <h3 className="font-normal text-brand text-[15px] md:text-[22px]">
                      {r.title}
                    </h3>
                    {r.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground md:text-sm">
                        {r.description}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {hasQuery && (
            <button
              type="button"
              onClick={() => {
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                onClose();
              }}
              className="mt-3 w-full rounded-full border border-border py-2 text-sm font-medium text-brand hover:bg-muted md:rounded"
            >
              See all results for “{query.trim()}” →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
