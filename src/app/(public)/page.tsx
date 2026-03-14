import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";

const navLinks = [
  { label: "About Us", href: "#" },
  { label: "Glacier Climb", href: "/tags/Glacier Climb" },
  { label: "Alpine Rock", href: "/tags/Alpine Rock" },
  { label: "Scramble", href: "/tags/Scramble" },
];

const locationLinks = [
  { label: "North Cascades", href: "#" },
  { label: "South Cascades", href: "#" },
  { label: "Mount Rainier", href: "#" },
  { label: "Alpine Lakes Wilderness", href: "#" },
];

export default async function HomePage() {
  const [featuredClimbs, recentPosts] = await Promise.all([
    db
      .select({
        title: posts.title,
        slug: posts.slug,
        description: posts.description,
        coverImage: posts.coverImage,
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
      })
      .from(posts)
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.publishedAt))
      .limit(3),
  ]);

  return (
    <div>
      {/* Hero Banner — breaks out of container to go full-width */}
      <div className="relative -mt-8 left-1/2 -translate-x-1/2 w-screen overflow-hidden">
        <img
          src="/home_cover.jpeg"
          alt="Mountain landscape"
          className="w-full h-[450px] object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Hippo Hamster" width={120} height={120} />
            <span className="text-6xl font-bold text-white drop-shadow-lg">
              Hippo
              <br />
              Hamster
            </span>
            <div className="self-stretch w-[2px] bg-white/60" />
            <span className="text-4xl font-bold text-white/90 tracking-wide drop-shadow-lg">
              Washington Alpine Adventures
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="flex items-center justify-center gap-8 py-4">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="text-foreground hover:text-brand font-medium"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Featured Climbs + Recent Posts side by side */}
      <div className="grid grid-cols-[2fr_auto_1fr] gap-8 mt-4">
        {/* Featured Climbs */}
        <div className="pl-12">
          <h2 className="text-[50px] font-semibold text-brand-grey">Featured Climbs</h2>
          <div className="mt-4 space-y-6">
            {featuredClimbs.map((fp) => (
              <Link
                key={fp.slug}
                href={`/posts/${fp.slug}`}
                className="flex items-start gap-6 group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-brand text-[27px]">
                    {fp.title}
                  </h3>
                  {fp.description && (
                    <p className="text-[20px] text-muted-foreground line-clamp-2 mt-0.5">
                      {fp.description}
                    </p>
                  )}
                  {fp.tripDate && (
                    <p className="text-[16px] text-muted-foreground mt-1">
                      {new Date(fp.tripDate).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      by Siyi
                    </p>
                  )}
                </div>
                {fp.coverImage && (
                  <img
                    src={fp.coverImage}
                    alt={fp.title}
                    className="w-[280px] h-[160px] object-cover rounded-md shrink-0"
                  />
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-border" />

        {/* Recent Posts */}
        <div className="pr-12">
          <h2 className="text-[35px] font-medium text-brand-grey">Recent Post</h2>
          <div className="mt-4 space-y-6">
            {recentPosts.map((post) => (
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
            <Link
              href="#"
              className="text-brand font-medium hover:underline inline-block"
            >
              Read More &gt;
            </Link>
          </div>

          {/* Climbs by Location */}
          <h2 className="text-2xl font-bold text-brand-grey mt-8">
            Climbs by Location
          </h2>
          <nav className="mt-3 flex flex-col gap-2">
            {locationLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-brand hover:underline font-medium ml-1"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
