import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { HeroBanner } from "@/components/hero-banner";
import { NavBar } from "@/components/nav-bar";
import { InfinitePostCardList } from "@/components/infinite-post-card-list";
import { PostCardList } from "@/components/post-card-list";
import { PostLinkList } from "@/components/post-link-list";

const PAGE_SIZE = 10;

export default async function PostsPage() {
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
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.publishedAt))
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
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.viewCount))
      .limit(5),
  ]);

  return (
    <div>
      <HeroBanner />
      <NavBar />

      {/* Desktop layout */}
      <div className="hidden md:grid grid-cols-[2fr_auto_1fr] gap-8 mt-4">
        <InfinitePostCardList
          title="Latest Climbs"
          initialPosts={latestPosts}
          sort="latest"
          pageSize={PAGE_SIZE}
        />
        <div className="w-px bg-border" />
        <PostLinkList title="Most Popular" posts={popularPosts} readMoreHref="/" />
      </div>

      {/* Mobile layout */}
      <div className="md:hidden px-4 space-y-3">
        <PostCardList title="Most Popular" posts={popularPosts} />
        <div className="-mx-4 border-t border-gray-300" />
        <InfinitePostCardList
          title="Latest Climbs"
          initialPosts={latestPosts}
          sort="latest"
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
