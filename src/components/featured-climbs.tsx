import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq, ne, and, desc } from "drizzle-orm";
import Link from "next/link";

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
      <div className="mt-4 space-y-8">
        {featured.map((fp) => (
          <Link key={fp.slug} href={`/posts/${fp.slug}`} className="block group">
            <h3 className="font-semibold text-brand transition-colors line-clamp-1">
              {fp.title}
            </h3>
            {fp.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {fp.description}
              </p>
            )}
            {fp.coverImage && (
              <img
                src={fp.coverImage}
                alt={fp.title}
                className="mt-2 w-full aspect-[2/1] object-cover rounded-md"
              />
            )}
          </Link>
        ))}
      </div>
    </aside>
  );
}
