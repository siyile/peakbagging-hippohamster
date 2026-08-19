import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { HeroBanner } from "@/components/hero-banner";
import { NavBar } from "@/components/nav-bar";
import { PostCardList } from "@/components/post-card-list";
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

// Without a timer this page is prerendered once per deploy, freezing the
// view-count-ordered popular list: /api/views bumps viewCount without
// revalidating (deliberately — busting the busiest page's cache on every
// pageview would effectively un-cache it). Hourly is ample for a soft signal.
export const revalidate = 3600;


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
        author: posts.author,
      })
      .from(posts)
      .where(eq(posts.status, "published"))
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
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.viewCount))
      .limit(5),
  ]);

  return (
    <div>
      <HeroBanner />
      <NavBar />

      {/* One grid for both breakpoints. Mobile stacks Featured (with photos)
          above the feed; desktop drops those hidden cells out of the grid
          entirely, leaving feed | divider | Featured across three columns.
          Rendering the feed once matters: a second copy would run its own
          fetch loop off the shared window scroll and double every API call. */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_auto_1fr] gap-4 md:gap-8 md:mt-4 px-4 md:px-0">
        <PopularClimbs
          posts={popularPosts.slice(0, 4)}
          withPhotos
          className="md:hidden"
        />
        <PostCardList title="Latest Climbs" posts={latestPosts} />
        <div className="hidden md:block w-px bg-border" />
        <PopularClimbs posts={popularPosts} className="hidden md:block" />
      </div>
    </div>
  );
}
