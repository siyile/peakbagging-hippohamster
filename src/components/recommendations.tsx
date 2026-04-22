"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getRecommendations,
  type RecommendedPost,
} from "@/lib/recommendations";
import { getSeenSlugs } from "@/lib/seen-posts";

type State =
  | { status: "loading" }
  | { status: "done"; posts: RecommendedPost[] };

const TITLE = "Featured Climbs";

export function Recommendations({
  tagFilter,
  currentSlug,
  limit = 5,
  className,
  withPhotos = false,
}: {
  tagFilter?: string;
  currentSlug?: string;
  limit?: number;
  className?: string;
  withPhotos?: boolean;
}) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const seen = getSeenSlugs();
    const combined = currentSlug
      ? Array.from(new Set([currentSlug, ...seen]))
      : seen;
    let cancelled = false;
    getRecommendations({ seenSlugs: combined, tagFilter, limit })
      .then((result) => {
        if (cancelled) return;
        setState({ status: "done", posts: result.posts });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "done", posts: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [tagFilter, currentSlug, limit]);

  if (withPhotos) {
    if (state.status === "loading") {
      return (
        <aside className={className}>
          <h2 className="text-3xl font-bold text-brand-grey">{TITLE}</h2>
          <div className="mt-4 space-y-4 md:space-y-8 pb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="h-6 w-full bg-muted rounded mb-2 animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded mb-2 animate-pulse" />
                <div className="aspect-[3/2] w-full bg-muted rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        </aside>
      );
    }
    if (state.posts.length === 0) return null;
    return (
      <aside className={className}>
        <h2 className="text-3xl font-bold text-brand-grey">{TITLE}</h2>
        <div className="mt-4 space-y-4 md:space-y-8 pb-6">
          {state.posts.map((post) => (
            <Link
              key={post.slug}
              href={`/posts/${post.slug}`}
              className="block group"
            >
              <h3 className="text-xl md:text-lg font-semibold text-brand transition-colors line-clamp-1">
                {post.title}
              </h3>
              {post.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {post.description}
                </p>
              )}
              {post.coverImage && (
                <Image
                  src={post.coverImageThumb || post.coverImage}
                  alt={post.title}
                  width={600}
                  height={400}
                  className="w-full aspect-[3/2] object-cover rounded-md mt-2"
                />
              )}
            </Link>
          ))}
        </div>
      </aside>
    );
  }

  if (state.status === "loading") {
    return (
      <aside className={className}>
        <div className="hidden md:block pr-12">
          <h2 className="text-[35px] font-medium text-brand-grey">{TITLE}</h2>
          <div className="mt-4 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="h-7 w-3/4 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="md:hidden">
          <h2 className="text-3xl font-semibold text-brand-grey mt-2">{TITLE}</h2>
          <div className="mt-3 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="h-6 w-3/4 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  if (state.posts.length === 0) return null;

  return (
    <aside className={className}>
      {/* Desktop */}
      <div className="hidden md:block pr-12">
        <h2 className="text-[35px] font-medium text-brand-grey">{TITLE}</h2>
        <div className="mt-4 space-y-6">
          {state.posts.map((post) => (
            <div key={post.slug}>
              <Link
                href={`/posts/${post.slug}`}
                className="font-normal text-brand text-[27px] hover:underline"
              >
                {post.title}
              </Link>
              {post.description && (
                <p className="text-base text-muted-foreground line-clamp-2 mt-0.5">
                  {post.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <h2 className="text-3xl font-semibold text-brand-grey mt-2">{TITLE}</h2>
        <div className="mt-3 space-y-4">
          {state.posts.map((post) => (
            <Link key={post.slug} href={`/posts/${post.slug}`} className="block">
              <h3 className="text-xl font-semibold text-brand">{post.title}</h3>
              {post.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {post.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
