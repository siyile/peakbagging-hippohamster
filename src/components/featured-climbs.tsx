import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq, ne, and, desc } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";

export async function FeaturedClimbs({
  excludeId,
  limit = 5,
  className,
}: {
  excludeId?: number;
  limit?: number;
  className?: string;
}) {
  const where = excludeId
    ? and(eq(posts.status, "published"), ne(posts.id, excludeId))
    : eq(posts.status, "published");

  const featured = await db
    .select({
      title: posts.title,
      slug: posts.slug,
      description: posts.description,
      coverImage: posts.coverImage,
      coverImageThumb: posts.coverImageThumb,
      viewCount: posts.viewCount,
    })
    .from(posts)
    .where(where)
    .orderBy(desc(posts.viewCount))
    .limit(limit);

  if (featured.length === 0) return null;

  return (
    <aside className={className}>
      <h2 className="text-3xl font-bold text-brand-grey">Featured Climbs</h2>
      <div className="mt-4 space-y-4 md:space-y-8 pb-6">
        {featured.map((fp) => (
          <Link key={fp.slug} href={`/posts/${fp.slug}`} className="block group">
            <h3 className="text-xl md:text-lg font-semibold text-brand transition-colors line-clamp-1">
              {fp.title}
            </h3>
            {fp.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {fp.description}
              </p>
            )}
            {fp.coverImage && (
              <Image
                src={fp.coverImageThumb || fp.coverImage}
                alt={fp.title}
                width={560}
                height={280}
                className="w-full aspect-[2/1] object-cover rounded-md mt-2"
              />
            )}
          </Link>
        ))}
      </div>
    </aside>
  );
}
