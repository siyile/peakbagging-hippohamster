"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
  inputRef,
}: {
  open: boolean;
  onClose: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const router = useRouter();
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

  // Focusing happens synchronously in the parent's click handler so iOS
  // opens the soft keyboard. Here we only handle close-side cleanup.
  useEffect(() => {
    if (open) return;
    inputRef.current?.blur();
    setQuery("");
    setResults([]);
  }, [open, inputRef]);

  // Lock body scroll while overlay is open. Pad the body by the vanished
  // scrollbar's width so the page behind doesn't shift right.
  useEffect(() => {
    if (!open) return;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
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

  return (
    <div
      className={`fixed inset-0 z-[100] bg-background md:bg-black/50 ${
        open ? "" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
      role="presentation"
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 flex flex-col bg-background md:inset-auto md:left-1/2 md:top-10 md:block md:w-full md:max-w-[800px] md:-translate-x-1/2 md:rounded-lg md:shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="flex items-center gap-1 pl-1 p-3 md:border-b md:p-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="shrink-0 cursor-pointer rounded-full p-2 text-muted-foreground hover:text-foreground md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-full bg-muted py-1 pl-4 pr-2 md:rounded-md md:py-1.5">
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
              className="no-native-clear w-0 min-w-0 flex-1 bg-transparent text-md outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="shrink-0 cursor-pointer rounded-full p-1 text-muted-foreground hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            <div aria-hidden className="h-5 w-px shrink-0 bg-border" />
            <button
              type="submit"
              disabled={!hasQuery}
              className="shrink-0 cursor-pointer rounded-md pl-1 pr-2 py-1 text-md font-medium text-brand hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-brand"
            >
              Search
            </button>
          </div>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:max-h-[70vh] md:flex-none">
          {!hasQuery && (
            <p className="py-8 text-center text-base text-muted-foreground md:text-sm">
              Start typing to search by title, tag, or description.
            </p>
          )}

          {showNoResults && (
            <div className="py-6 text-center">
              <p className="text-base text-muted-foreground md:text-sm">
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
                    <h3 className="font-normal text-brand text-[18px] md:text-[22px]">
                      {r.title}
                    </h3>
                    {r.description && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
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
              className="mt-3 w-full rounded-full border border-border py-2 text-base font-medium text-brand hover:bg-muted md:rounded md:text-sm"
            >
              See all results for “{query.trim()}” →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
