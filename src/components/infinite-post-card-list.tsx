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
            })}{" "}
            by Siyi
          </p>
        )}
      </div>
      {fp.coverImage && (
        <Image
          src={fp.coverImageThumb || fp.coverImage}
          alt={fp.title}
          width={280}
          height={160}
          className="w-[280px] h-[160px] object-cover rounded-md shrink-0"
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
          height={300}
          className="w-full aspect-[2/1] object-cover rounded-md"
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
  pageSize = 10,
}: {
  title: string;
  initialPosts: PostCard[];
  sort: "latest" | "popular";
  tag?: string;
  pageSize?: number;
}) {
  const [posts, setPosts] = useState<PostCard[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length >= pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const mobileSentinelRef = useRef<HTMLDivElement>(null);

  // Use refs to avoid stale closures in the observer callback
  const offsetRef = useRef(initialPosts.length);
  const hasMoreRef = useRef(initialPosts.length >= pageSize);
  const loadingRef = useRef(false);

  const fetchMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;

    const params = new URLSearchParams({
      offset: String(offsetRef.current),
      limit: String(pageSize),
      sort,
    });
    if (tag) params.set("tag", tag);

    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();

    setPosts((prev) => [...prev, ...data.posts]);
    offsetRef.current += data.posts.length;
    hasMoreRef.current = data.hasMore;
    setHasMore(data.hasMore);
    loadingRef.current = false;
  }, [sort, tag, pageSize]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fetchMore();
        }
      },
      { rootMargin: "200px" }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    if (mobileSentinelRef.current) observer.observe(mobileSentinelRef.current);

    return () => observer.disconnect();
  }, [fetchMore]);

  const endMessage = !hasMore && posts.length > 0 && (
    <p className="text-center text-muted-foreground py-6">
      — You&apos;ve reached the end —
    </p>
  );

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
        {endMessage}
        <div ref={sentinelRef} />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <h2 className="text-3xl font-semibold text-brand-grey mt-2">{title}</h2>
        <div className="mt-3 space-y-4">
          {posts.map((fp) => (
            <PostCardMobile key={fp.slug} fp={fp} />
          ))}
        </div>
        {endMessage}
        <div ref={mobileSentinelRef} />
      </div>
    </>
  );
}
