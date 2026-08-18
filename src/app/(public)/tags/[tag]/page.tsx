import type { Metadata } from "next";
import { db } from "@/db";
import { posts, tags, postTags } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { HeroBanner } from "@/components/hero-banner";
import { NavBar } from "@/components/nav-bar";
import { InfinitePostCardList } from "@/components/infinite-post-card-list";
import { PopularClimbs } from "@/components/popular-climbs";

// Tag membership only changes on admin edit, so daily is plenty. Without
// this the page was fully SSR'd (two DB queries) on every hit.
export const revalidate = 86400;

export async function generateStaticParams() {
  const rows = await db
    .select({ name: tags.name })
    .from(tags)
    .innerJoin(postTags, eq(tags.id, postTags.tagId))
    .innerJoin(posts, eq(postTags.postId, posts.id))
    .where(eq(posts.status, "published"));

  // Lookups below are case-insensitive and some tags differ only by case
  // (scramble / Scramble), so dedupe to avoid prerendering duplicate pages.
  const seen = new Set<string>();
  const params: { tag: string }[] = [];
  for (const { name } of rows) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      params.push({ tag: name });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: decoded,
    description: `Browse every ${decoded} trip report from the PNW, with detailed route beta, conditions, climb stats, and photos.`,
    alternates: {
      canonical: `/tags/${encodeURIComponent(decoded)}`,
    },
  };
}

const PAGE_SIZE = 10;

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
      .orderBy(desc(posts.tripDate))
      .limit(PAGE_SIZE),
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

  // A tag with no published posts is a dead end — return a real 404 rather than
  // a thin 200 page, which Google flags as a soft 404.
  if (latestPosts.length === 0) {
    notFound();
  }

  const showPopular = latestPosts.length >= PAGE_SIZE;

  return (
    <div>
      <HeroBanner />
      <NavBar />

      {/* One grid for both breakpoints: mobile is the feed alone, desktop adds
          the divider and right rail. The feed is mounted once — a second copy
          would run its own fetch loop off the shared window scroll. */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_auto_1fr] gap-4 md:gap-8 md:mt-4 px-4 md:px-0">
        <InfinitePostCardList
          title={`Latest ${decoded} Trips`}
          initialPosts={latestPosts}
          sort="latest"
          tag={decoded}
          pageSize={PAGE_SIZE}
        />
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
