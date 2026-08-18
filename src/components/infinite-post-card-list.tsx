"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";

interface PostCard {
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  coverImageThumb: string | null;
  tripDate?: string | Date | null;
  author?: string | null;
}

// Pages past the first live only in this component's state, so leaving for a
// post destroys them. The browser then restores the saved scroll offset
// against a document that is suddenly ten cards tall and silently clamps it,
// dropping you at the bottom of page one instead of on the card you clicked.
// Snapshotting the loaded pages per history entry lets us rebuild the document
// first and re-apply the offset ourselves.
const SNAPSHOT_PREFIX = "feed-snapshot:";
const HISTORY_ID_KEY = "__feedEntryId";
const MAX_SNAPSHOTS = 8;

interface Snapshot {
  key: string;
  posts: PostCard[];
  offset: number;
  hasMore: boolean;
  scrollY: number;
  savedAt: number;
}

// Stamp a stable id into the current history entry the first time a feed
// mounts under it. Coming back hands us the same entry, and so the same id,
// while a fresh push to the same URL gets a new one — so clicking "Home" from
// a post starts at the top rather than dropping you mid-feed.
function historyEntryId(): string | null {
  try {
    const state = window.history.state as Record<string, unknown> | null;
    const existing = state?.[HISTORY_ID_KEY];
    if (typeof existing === "string") return existing;
    const id = Math.random().toString(36).slice(2);
    // The App Router patches replaceState; spreading the existing state keeps
    // its internal __NA / tree fields intact so it takes the pass-through path.
    window.history.replaceState({ ...state, [HISTORY_ID_KEY]: id }, "");
    return id;
  } catch {
    return null;
  }
}

function readSnapshot(id: string | null, key: string): Snapshot | null {
  if (!id) return null;
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_PREFIX + id);
    if (!raw) return null;
    const snap = JSON.parse(raw) as Snapshot;
    return snap.key === key && Array.isArray(snap.posts) ? snap : null;
  } catch {
    return null;
  }
}

// One snapshot accumulates per history entry and sessionStorage lives for the
// whole tab, so trim to the most recent few. `keep: 0` clears them all, which
// is the quota-exceeded escape hatch below.
function pruneSnapshots(keep: number) {
  try {
    const found: { storageKey: string; savedAt: number }[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const storageKey = sessionStorage.key(i);
      if (!storageKey?.startsWith(SNAPSHOT_PREFIX)) continue;
      let savedAt = 0;
      try {
        savedAt =
          (JSON.parse(sessionStorage.getItem(storageKey) ?? "{}") as Snapshot)
            .savedAt ?? 0;
      } catch {
        // Unparseable leftover: savedAt 0 sorts it to the front of the cull.
      }
      found.push({ storageKey, savedAt });
    }
    found
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(keep)
      .forEach((e) => sessionStorage.removeItem(e.storageKey));
  } catch {
    // Storage blocked entirely; restoration just won't happen.
  }
}

function writeSnapshot(id: string | null, snap: Snapshot) {
  if (!id) return;
  const payload = JSON.stringify(snap);
  try {
    sessionStorage.setItem(SNAPSHOT_PREFIX + id, payload);
  } catch {
    // Out of quota (or storage blocked). Drop every snapshot and try once
    // more — losing older restore points beats throwing mid-scroll.
    pruneSnapshots(0);
    try {
      sessionStorage.setItem(SNAPSHOT_PREFIX + id, payload);
    } catch {
      // Give up silently.
    }
  }
}

// useLayoutEffect warns when it runs on the server and this component is
// server-rendered; restoration is browser-only anyway.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function PostCardDesktop({ fp }: { fp: PostCard }) {
  return (
    <Link
      href={`/posts/${fp.slug}`}
      className="flex items-start gap-6 group"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-brand text-[27px]">{fp.title}</h3>
        {fp.description && (
          <p className="text-[20px] text-muted-foreground line-clamp-2 mt-0.5">
            {fp.description}
          </p>
        )}
        {fp.tripDate && (
          <p className="text-[16px] text-muted-foreground mt-1">
            {new Date(fp.tripDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}{" "}
            by {fp.author || "Siyi"}
          </p>
        )}
      </div>
      {fp.coverImage && (
        <Image
          src={fp.coverImageThumb || fp.coverImage}
          alt={fp.title}
          width={600}
          height={400}
          className="w-[280px] aspect-[3/2] object-cover rounded-md shrink-0"
        />
      )}
    </Link>
  );
}

function PostCardMobile({ fp }: { fp: PostCard }) {
  return (
    <Link href={`/posts/${fp.slug}`} className="block group">
      {fp.coverImage && (
        <Image
          src={fp.coverImageThumb || fp.coverImage}
          alt={fp.title}
          width={600}
          height={400}
          className="w-full aspect-[3/2] object-cover rounded-md"
        />
      )}
      <h3 className="text-xl font-semibold text-brand mt-1">{fp.title}</h3>
      {fp.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
          {fp.description}
        </p>
      )}
    </Link>
  );
}

export function InfinitePostCardList({
  title,
  initialPosts,
  sort,
  tag,
  query,
  pageSize = 10,
  className,
}: {
  title: string;
  initialPosts: PostCard[];
  sort?: "latest" | "popular";
  tag?: string;
  query?: string;
  pageSize?: number;
  className?: string;
}) {
  const [posts, setPosts] = useState<PostCard[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length >= pageSize);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const mobileSentinelRef = useRef<HTMLDivElement>(null);

  // Use refs to avoid stale closures in the observer callback
  const offsetRef = useRef(initialPosts.length);
  const hasMoreRef = useRef(initialPosts.length >= pageSize);
  const loadingRef = useRef(false);

  const pathname = usePathname();
  const snapshotKey = `${pathname}|${query ?? ""}|${sort ?? ""}|${tag ?? ""}`;
  const entryIdRef = useRef<string | null>(null);
  const postsRef = useRef(posts);
  const scrollYRef = useRef(0);
  // Set by the mount effect, consumed once the commit that added the restored
  // cards has landed.
  const pendingRestoreRef = useRef<{ scrollY: number; count: number } | null>(
    null
  );

  postsRef.current = posts;

  const persist = useCallback(() => {
    writeSnapshot(entryIdRef.current, {
      key: snapshotKey,
      posts: postsRef.current,
      offset: offsetRef.current,
      hasMore: hasMoreRef.current,
      scrollY: scrollYRef.current,
      savedAt: Date.now(),
    });
  }, [snapshotKey]);

  const fetchMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      offset: String(offsetRef.current),
      limit: String(pageSize),
    });
    if (query) {
      params.set("q", query);
    } else {
      params.set("sort", sort ?? "latest");
      if (tag) params.set("tag", tag);
    }

    const endpoint = query ? "/api/search" : "/api/posts";
    try {
      const res = await fetch(`${endpoint}?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.posts)) throw new Error("bad response shape");
      setPosts((prev) => [...prev, ...data.posts]);
      offsetRef.current += data.posts.length;
      hasMoreRef.current = data.hasMore;
      setHasMore(data.hasMore);
      // Mirror the append onto the ref so the snapshot below sees the new page
      // without waiting for the re-render.
      postsRef.current = [...postsRef.current, ...data.posts];
      persist();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [sort, tag, query, pageSize, persist]);

  // Restore in a layout effect rather than in useState's initializer: the
  // first render has to match the server HTML or hydration breaks.
  useIsomorphicLayoutEffect(() => {
    entryIdRef.current = historyEntryId();
    pruneSnapshots(MAX_SNAPSHOTS);

    const snap = readSnapshot(entryIdRef.current, snapshotKey);
    if (!snap) return;

    if (snap.posts.length > initialPosts.length) {
      setPosts(snap.posts);
      setHasMore(snap.hasMore);
      // offset counts rows already consumed from the API, which is exactly the
      // restored card count; clamp so a partial snapshot can't skip a page.
      offsetRef.current = Math.min(snap.offset, snap.posts.length);
      hasMoreRef.current = snap.hasMore;
    }
    pendingRestoreRef.current = {
      scrollY: snap.scrollY,
      count: Math.max(snap.posts.length, initialPosts.length),
    };
    // Mount-only: a later snapshotKey change means a different feed entirely,
    // and those call sites remount via `key`.
  }, []);

  // Runs again after the commit that added the restored cards, so the document
  // is tall enough to hold the offset. React flushes state set from a layout
  // effect before paint, so this still lands in the same frame — no jump.
  useIsomorphicLayoutEffect(() => {
    const pending = pendingRestoreRef.current;
    if (!pending || posts.length < pending.count) return;
    pendingRestoreRef.current = null;

    const { scrollY } = pending;
    window.scrollTo(0, scrollY);

    // The App Router does no scroll restoration of its own, so the browser's
    // native (already clamped) restore is still in flight and can land after
    // ours. Re-apply for a few frames if it drifts.
    let frames = 0;
    let raf = requestAnimationFrame(function reapply() {
      if (Math.abs(window.scrollY - scrollY) > 2) window.scrollTo(0, scrollY);
      if (++frames < 3) raf = requestAnimationFrame(reapply);
    });
    return () => cancelAnimationFrame(raf);
  }, [posts]);

  // A layout-effect cleanup runs in the commit's mutation phase, before the
  // incoming route's layout effects scroll the window to the top — so this
  // captures the real offset. A passive cleanup would record 0.
  useIsomorphicLayoutEffect(() => persist, [persist]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fetchMore();
        }
      },
      { rootMargin: "400px" }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    if (mobileSentinelRef.current) observer.observe(mobileSentinelRef.current);

    // Snapshot the offset as the user scrolls so it survives the jump to a
    // post. Throttled: a burst writes at most every 200ms, and the trailing
    // write captures where the burst ended.
    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
      if (persistTimer === null) {
        persistTimer = setTimeout(() => {
          persistTimer = null;
          persist();
        }, 200);
      }
      const remaining =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight);
      if (remaining < 600) fetchMore();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Full page unloads skip React's cleanup entirely.
    window.addEventListener("pagehide", persist);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", persist);
      if (persistTimer !== null) clearTimeout(persistTimer);
    };
  }, [fetchMore, persist]);

  const statusMessage = error ? (
    <div className="text-center py-6 space-y-2">
      <p className="text-red-600 text-sm">Failed to load: {error}</p>
      <button
        onClick={fetchMore}
        className="text-sm underline text-muted-foreground"
      >
        Tap to retry
      </button>
    </div>
  ) : loading ? (
    <p className="text-center text-muted-foreground py-6">Loading…</p>
  ) : !hasMore && posts.length > 0 ? (
    <p className="text-center text-muted-foreground py-6">
      — You&apos;ve reached the end —
    </p>
  ) : hasMore ? (
    <div className="text-center py-6">
      <button
        onClick={fetchMore}
        className="text-sm underline text-muted-foreground"
      >
        Load more
      </button>
    </div>
  ) : null;

  return (
    <div className={className}>
      {/* Desktop */}
      <div className="hidden md:block pl-12">
        <h2 className="text-[50px] font-semibold text-brand-grey">{title}</h2>
        <div className="mt-4 space-y-6">
          {posts.map((fp) => (
            <PostCardDesktop key={fp.slug} fp={fp} />
          ))}
        </div>
        {statusMessage}
        <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <h2 className="text-3xl font-semibold text-brand-grey mt-2">{title}</h2>
        <div className="mt-3 space-y-4">
          {posts.map((fp) => (
            <PostCardMobile key={fp.slug} fp={fp} />
          ))}
        </div>
        {statusMessage}
        <div ref={mobileSentinelRef} aria-hidden="true" className="h-1 w-full" />
      </div>
    </div>
  );
}
