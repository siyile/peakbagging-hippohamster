import type { Metadata } from "next";
import { db } from "@/db";
import { posts, tags, postTags } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { HeroBanner } from "@/components/hero-banner";
import { NavBar } from "@/components/nav-bar";
import { InfinitePostCardList } from "@/components/infinite-post-card-list";
import { PopularClimbs } from "@/components/popular-climbs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: decoded,
    description: `Browse all ${decoded} trip reports — detailed route beta with photos from the Washington Cascades.`,
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

  if (latestPosts.length === 0) {
    return (
      <div>
        <HeroBanner />
        <NavBar />
        <div className="pl-12 mt-8">
          <h1 className="text-3xl font-bold">No posts tagged &ldquo;{decoded}&rdquo;</h1>
        </div>
      </div>
    );
  }

  const showPopular = latestPosts.length >= PAGE_SIZE;

  return (
    <div>
      <HeroBanner />
      <NavBar />

      {/* Desktop layout */}
      <div className="hidden md:grid grid-cols-[2fr_auto_1fr] gap-8 mt-4">
        <InfinitePostCardList
          title={`Latest ${decoded} Trips`}
          initialPosts={latestPosts}
          sort="latest"
          tag={decoded}
          pageSize={PAGE_SIZE}
        />
        {showPopular && (
          <>
            <div className="w-px bg-border" />
            <PopularClimbs posts={popularPosts} />
          </>
        )}
      </div>

      {/* Mobile layout */}
      <div className="md:hidden px-4 space-y-3">
        <InfinitePostCardList
          title={`Latest ${decoded} Trips`}
          initialPosts={latestPosts}
          sort="latest"
          tag={decoded}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
