"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";

interface PostCard {
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  coverImageThumb: string | null;
  tripDate?: string | Date | null;
}

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
            by Siyi
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
}: {
  title: string;
  initialPosts: PostCard[];
  sort?: "latest" | "popular";
  tag?: string;
  query?: string;
  pageSize?: number;
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
    if (mobileSentinelRef.current) observer.observe(mobileSentinelRef.current);

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
    <>
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
    </>
  );
}
