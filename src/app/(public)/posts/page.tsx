import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { HeroBanner } from "@/components/hero-banner";
import { NavBar } from "@/components/nav-bar";
import { InfinitePostCardList } from "@/components/infinite-post-card-list";
import { PostLinkList } from "@/components/post-link-list";

export const metadata = {
  title: "Trip Reports",
  description:
    "Trip reports and route beta for peaks across the Washington Cascades and Olympics: scrambles, alpine rock, glacier climbs, and ski tours, with photos.",
  alternates: {
    canonical: "/posts",
  },
};

// Same reasoning as the homepage: without a timer the view-count-ordered
// "Most Popular" list freezes at build time, since /api/views never
// revalidates after bumping viewCount.
export const revalidate = 3600;

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
        author: posts.author,
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

      {/* One grid for both breakpoints: mobile is the feed alone, desktop adds
          the divider and right rail. The feed is mounted once — a second copy
          would run its own fetch loop off the shared window scroll. */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_auto_1fr] gap-4 md:gap-8 md:mt-4 px-4 md:px-0">
        <InfinitePostCardList
          title="Latest Climbs"
          initialPosts={latestPosts}
          sort="latest"
          pageSize={PAGE_SIZE}
        />
        <div className="hidden md:block w-px bg-border" />
        <div className="hidden md:block">
          <PostLinkList title="Most Popular" posts={popularPosts} readMoreHref="/" />
        </div>
      </div>
    </div>
  );
}
