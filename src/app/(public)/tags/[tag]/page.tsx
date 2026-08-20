import type { Metadata } from "next";
import { db } from "@/db";
import { posts, tags, postTags } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { HeroBanner } from "@/components/hero-banner";
import { NavBar } from "@/components/nav-bar";
import { PostCardList } from "@/components/post-card-list";
import { PopularClimbs } from "@/components/popular-climbs";
import { getCanonicalTagName, getPublishedTagNames } from "@/lib/tags";

// Tag membership only changes on admin edit, so daily is plenty. Without
// this the page was fully SSR'd (two DB queries) on every hit.
export const revalidate = 86400;

export async function generateStaticParams() {
  const names = await getPublishedTagNames();
  return names.map((tag) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);

  // Point at the tag's stored casing, not the casing in the URL — otherwise
  // /tags/smoot and /tags/Smoot each declare themselves canonical and Google
  // sees two URLs for one page. A redirect cannot fix this: route matching is
  // case-insensitive, so /tags/smoot -> /tags/Smoot matches itself and loops.
  // Falls back to the requested name for an unknown tag, which the page body
  // 404s anyway.
  const name = (await getCanonicalTagName(decoded)) ?? decoded;

  return {
    title: name,
    description: `Browse every ${name} trip report from the PNW, with detailed route beta, conditions, climb stats, and photos.`,
    alternates: {
      canonical: `/tags/${encodeURIComponent(name)}`,
    },
  };
}

// A tag needs a decent number of posts before a "most popular within this
// tag" rail says anything useful. Was PAGE_SIZE back when the feed was paged;
// the threshold is unchanged, the name now says what it is for.
const MIN_POSTS_FOR_POPULAR_RAIL = 10;

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);

  const [latestPosts, popularPosts] = await Promise.all([
    db
      .select({
        title: posts.title,
        slug: posts.slug,
        description: posts.description,
        coverImage: posts.coverImage,
        coverImageThumb: posts.coverImageThumb,
        tripDate: posts.tripDate,
        author: posts.author,
      })
      .from(posts)
      .innerJoin(postTags, eq(posts.id, postTags.postId))
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(and(eq(posts.status, "published"), sql`lower(${tags.name}) = ${decoded.toLowerCase()}`))
      .orderBy(desc(posts.tripDate)),
    db
      .select({
        title: posts.title,
        slug: posts.slug,
        description: posts.description,
        coverImage: posts.coverImage,
        coverImageThumb: posts.coverImageThumb,
      })
      .from(posts)
      .innerJoin(postTags, eq(posts.id, postTags.postId))
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(and(eq(posts.status, "published"), sql`lower(${tags.name}) = ${decoded.toLowerCase()}`))
      .orderBy(desc(posts.viewCount))
      .limit(5),
  ]);

  // A tag with no published posts is a dead end. Note this cannot produce a
  // real 404 status: loading.tsx wraps the route in Suspense, so the shell has
  // already flushed 200 by the time this runs and the miss goes out as a soft
  // 404 (200 + the noindex Next injects on its not-found boundary). Google
  // honours the noindex, and the sitemap no longer advertises dead tags, so
  // nothing points here. Raising it in generateMetadata does not help —
  // metadata streams too. Only deleting every loading.tsx above this route
  // restores a 404 status, at the cost of the skeletons.
  if (latestPosts.length === 0) {
    notFound();
  }

  const showPopular = latestPosts.length >= MIN_POSTS_FOR_POPULAR_RAIL;

  return (
    <div>
      <HeroBanner />
      <NavBar />

      {/* One grid for both breakpoints: mobile is the feed alone, desktop adds
          the divider and right rail. The feed is mounted once — a second copy
          would run its own fetch loop off the shared window scroll. */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_auto_1fr] gap-4 md:gap-8 md:mt-4 px-4 md:px-0">
        <PostCardList title={`Latest ${decoded} Trips`} posts={latestPosts} />
        {showPopular && (
          <>
            <div className="hidden md:block w-px bg-border" />
            <PopularClimbs posts={popularPosts} className="hidden md:block" />
          </>
        )}
      </div>
    </div>
  );
}
