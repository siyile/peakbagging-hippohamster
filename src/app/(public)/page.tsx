import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { HeroBanner } from "@/components/hero-banner";
import { NavBar } from "@/components/nav-bar";
import { InfinitePostCardList } from "@/components/infinite-post-card-list";
import { Recommendations } from "@/components/recommendations";

export const metadata = {
  title: "Home",
  description:
    "Featured climbs and recent trip reports from Hippo and Hamster's Washington Cascades alpine adventures.",
};

const PAGE_SIZE = 10;

export default async function HomePage() {
  const [latestPosts, popularFallback] = await Promise.all([
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

      {/* Desktop: Latest Climbs + Recommendations */}
      <div className="hidden md:grid grid-cols-[2fr_auto_1fr] gap-8 mt-4">
        <InfinitePostCardList
          title="Latest Climbs"
          initialPosts={latestPosts}
          sort="latest"
          pageSize={PAGE_SIZE}
        />
        <div className="w-px bg-border" />
        <Recommendations
          mode={{ kind: "home" }}
          fallbackPosts={popularFallback}
        />
      </div>

      {/* Mobile: Featured (with photos) on top, Latest below with infinite scroll */}
      <div className="md:hidden px-4 space-y-3">
        <Recommendations
          mode={{ kind: "home" }}
          withPhotos
          fallbackPosts={popularFallback.slice(0, 4)}
        />
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
