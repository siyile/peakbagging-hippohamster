import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { HeroBanner } from "@/components/hero-banner";
import { NavBar } from "@/components/nav-bar";
import { InfinitePostCardList } from "@/components/infinite-post-card-list";
import { PopularClimbs } from "@/components/popular-climbs";

export const metadata = {
  title: {
    absolute: "HippoHamster: PNW Alpine Climbing Trip Reports & Route Beta",
  },
  description:
    "Featured climbs and recent trip reports from Hippo and Hamster's Washington Cascades alpine adventures.",
  alternates: {
    canonical: "/",
  },
};

const PAGE_SIZE = 10;

export default async function HomePage() {
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
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.viewCount))
      .limit(5),
  ]);

  return (
    <div>
      <HeroBanner />
      <NavBar />

      {/* Desktop: Latest Climbs + Featured */}
      <div className="hidden md:grid grid-cols-[2fr_auto_1fr] gap-8 mt-4">
        <InfinitePostCardList
          title="Latest Climbs"
          initialPosts={latestPosts}
          sort="latest"
          pageSize={PAGE_SIZE}
        />
        <div className="w-px bg-border" />
        <PopularClimbs posts={popularPosts} />
      </div>

      {/* Mobile: Featured (with photos) on top, Latest below with infinite scroll */}
      <div className="md:hidden px-4">
        <PopularClimbs posts={popularPosts.slice(0, 4)} withPhotos />
        <div className="mt-4">
          <InfinitePostCardList
            title="Latest Climbs"
            initialPosts={latestPosts}
            sort="latest"
            pageSize={PAGE_SIZE}
          />
        </div>
      </div>
    </div>
  );
}
