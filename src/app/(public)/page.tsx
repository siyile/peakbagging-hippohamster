import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { HeroBanner } from "@/components/hero-banner";
import { NavBar } from "@/components/nav-bar";
import { PostCardList } from "@/components/post-card-list";
import { PostLinkList } from "@/components/post-link-list";

export default async function HomePage() {
  const [featuredClimbs, recentPosts] = await Promise.all([
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
      .orderBy(desc(posts.viewCount))
      .limit(5),
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
      .orderBy(desc(posts.publishedAt))
      .limit(5),
  ]);

  return (
    <div>
      <HeroBanner />
      <NavBar />

      {/* Desktop: Featured Climbs + Recent Posts side by side */}
      <div className="hidden md:grid grid-cols-[2fr_auto_1fr] gap-8 mt-4">
        <PostCardList title="Featured Climbs" posts={featuredClimbs} />
        <div className="w-px bg-border" />
        <PostLinkList title="Recent Post" posts={recentPosts} readMoreHref="/posts" />
      </div>

      {/* Mobile layout */}
      <div className="md:hidden px-4 space-y-3">
        <PostCardList
          title="Featured Climbs"
          posts={featuredClimbs}
          moreHref="/posts"
          moreLabel="More Featured Climbs"
        />
        <div className="-mx-4 border-t border-gray-300" />
        <PostLinkList
          title="Recent Posts"
          posts={recentPosts}
          moreHref="/posts"
          moreLabel="More Recent Posts"
        />
      </div>
    </div>
  );
}
