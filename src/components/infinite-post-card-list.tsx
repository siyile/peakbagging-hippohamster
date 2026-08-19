"use client";

import Link from "next/link";
import { thumbSrcset, THUMB_SIZES } from "@/lib/image-variants";
import { useState, useEffect, useRef, useCallback } from "react";

interface PostCard {
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  coverImageThumb: string | null;
  tripDate?: string | Date | null;
  author?: string | null;
}

// One card for both breakpoints. This used to be two components rendered side
// by side and toggled with `hidden md:block` / `md:hidden`, which put every
// post in the DOM twice — and with infinite scroll that compounds, since each
// appended page re-reconciled both trees.
//
// Mobile stays `block` rather than `flex flex-col` on purpose: the cover is an
// inline replaced element there, and the line box it sits in contributes a few
// pixels of descender space above the title. Blockifying it as a flex item
// would silently tighten that gap.
function FeedCard({ fp }: { fp: PostCard }) {
  return (
    <Link
      href={`/posts/${fp.slug}`}
      className="group block md:flex md:items-start md:gap-6"
    >
      {fp.coverImage && (
        /* eslint-disable-next-line @next/next/no-img-element -- pre-generated
           thumbnail ladder straight from R2. Routing it through the optimizer
           only re-encoded an already-sized webp, cost a proxy hop, and billed
           a transformation per rung. */
        <img
          src={fp.coverImageThumb || fp.coverImage}
          {...(fp.coverImageThumb && {
            srcSet: thumbSrcset(fp.coverImageThumb),
            sizes: THUMB_SIZES,
          })}
          alt={fp.title}
          // Not the file's real aspect — object-cover crops to this box. These
          // are the figures next/image reserved, so the card holds its space
          // before loading exactly as it did before.
          width={600}
          height={400}
          loading="lazy"
          decoding="async"
          // `md:order-last` moves the cover to the right of the text on
          // desktop while keeping the title first in the DOM. `order` is
          // inert in block flow, so mobile still stacks cover-then-title.
          className="w-full aspect-[3/2] object-cover rounded-md md:order-last md:w-[280px] md:shrink-0"
        />
      )}
      <div className="md:flex-1 md:min-w-0">
        <h3 className="text-xl font-semibold text-brand mt-1 md:mt-0 md:text-[27px]">
          {fp.title}
        </h3>
        {fp.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5 md:text-[20px]">
            {fp.description}
          </p>
        )}
        {fp.tripDate && (
          <p className="hidden md:block text-[16px] text-muted-foreground mt-1">
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

  // Use refs to avoid stale closures in the observer callback
  const offsetRef = useRef(initialPosts.length);
  const hasMoreRef = useRef(initialPosts.length >= pageSize);
  const loadingRef = useRef(false);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [sort, tag, query, pageSize]);

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

    const onScroll = () => {
      const remaining =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight);
      if (remaining < 600) fetchMore();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [fetchMore]);

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
      <div className="md:pl-12">
        <h2 className="text-3xl font-semibold text-brand-grey mt-2 md:mt-0 md:text-[50px]">
          {title}
        </h2>
        <div className="mt-3 space-y-4 md:mt-4 md:space-y-6">
          {posts.map((fp) => (
            <FeedCard key={fp.slug} fp={fp} />
          ))}
        </div>
        {statusMessage}
        <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />
      </div>
    </div>
  );
}
