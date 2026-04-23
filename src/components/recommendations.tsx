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

const EMPTY_STATE: State = { status: "done", posts: [] };

const TITLE = "Featured Climbs";

const HOME_MIN_VISITS = 3;

type Mode =
  | { kind: "home" }
  | { kind: "post"; slug: string }
  | { kind: "tag"; tag: string };

type Props = {
  mode: Mode;
  limit?: number;
  className?: string;
  withPhotos?: boolean;
  // Shown when the recommendation seed isn't available yet (home mode below
  // the visit threshold, tag mode with no history). Ignored in post mode.
  fallbackPosts?: RecommendedPost[];
};

export function Recommendations({
  mode,
  limit = 5,
  className,
  withPhotos = false,
  fallbackPosts,
}: Props) {
  // Start empty so users below the visit threshold (or before localStorage
  // reads) see nothing — no skeleton flash. We only flip to loading once we
  // actually decide to fetch.
  const [state, setState] = useState<State>(EMPTY_STATE);

  // Pull primitives out so deps stay stable across renders.
  const modeKind = mode.kind;
  const modeSlug = mode.kind === "post" ? mode.slug : "";
  const modeTag = mode.kind === "tag" ? mode.tag : "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const seen = getSeenSlugs();
      let seedSlugs: string[];
      let tagFilter: string | undefined;

      if (modeKind === "home") {
        if (seen.length < HOME_MIN_VISITS) {
          if (fallbackPosts && fallbackPosts.length > 0) {
            setState({ status: "done", posts: fallbackPosts });
          }
          return;
        }
        seedSlugs = seen.slice(0, HOME_MIN_VISITS);
      } else if (modeKind === "post") {
        seedSlugs = [modeSlug];
      } else {
        // tag mode: relate to the most recent visit, restricted to this tag.
        if (seen.length === 0) {
          if (fallbackPosts && fallbackPosts.length > 0) {
            setState({ status: "done", posts: fallbackPosts });
          }
          return;
        }
        seedSlugs = [seen[0]];
        tagFilter = modeTag;
      }

      setState({ status: "loading" });
      try {
        const result = await getRecommendations({
          seedSlugs,
          tagFilter,
          limit,
        });
        if (!cancelled) setState({ status: "done", posts: result.posts });
      } catch {
        if (!cancelled) setState({ status: "done", posts: [] });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [modeKind, modeSlug, modeTag, limit, fallbackPosts]);

  if (withPhotos) {
    if (state.status === "loading") {
      return (
        <aside className={className}>
          <h2 className="text-3xl font-semibold text-brand-grey mt-2">{TITLE}</h2>
          <div className="mt-3 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/2] w-full bg-muted rounded-md animate-pulse" />
                <div className="h-6 w-full bg-muted rounded mt-1 animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded mt-1 animate-pulse" />
              </div>
            ))}
          </div>
        </aside>
      );
    }
    if (state.posts.length === 0) return null;
    return (
      <aside className={className}>
        <h2 className="text-3xl font-semibold text-brand-grey mt-2">{TITLE}</h2>
        <div className="mt-3 space-y-4">
          {state.posts.map((post) => (
            <Link
              key={post.slug}
              href={`/posts/${post.slug}`}
              className="block group"
            >
              {post.coverImage && (
                <Image
                  src={post.coverImageThumb || post.coverImage}
                  alt={post.title}
                  width={600}
                  height={400}
                  className="w-full aspect-[3/2] object-cover rounded-md"
                />
              )}
              <h3 className="text-xl font-semibold text-brand mt-1">
                {post.title}
              </h3>
              {post.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {post.description}
                </p>
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

  if (state.status !== "done" || state.posts.length === 0) return null;

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
