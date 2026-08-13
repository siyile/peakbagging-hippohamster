import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts, tags, postTags } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const POST_FIELDS = {
  title: posts.title,
  slug: posts.slug,
  description: posts.description,
  coverImage: posts.coverImage,
  coverImageThumb: posts.coverImageThumb,
  tripDate: posts.tripDate,
  author: posts.author,
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);
  const sort = url.searchParams.get("sort") || "latest";
  const tag = url.searchParams.get("tag");

  const orderBy =
    sort === "popular" ? desc(posts.viewCount) : desc(posts.tripDate);

  const rows = tag
    ? await db
        .select(POST_FIELDS)
        .from(posts)
        .innerJoin(postTags, eq(posts.id, postTags.postId))
        .innerJoin(tags, eq(postTags.tagId, tags.id))
        .where(
          and(
            eq(posts.status, "published"),
            sql`lower(${tags.name}) = ${tag.toLowerCase()}`
          )
        )
        .orderBy(orderBy)
        .offset(offset)
        .limit(limit)
    : await db
        .select(POST_FIELDS)
        .from(posts)
        .where(eq(posts.status, "published"))
        .orderBy(orderBy)
        .offset(offset)
        .limit(limit);

  return NextResponse.json(
    { posts: rows, hasMore: rows.length === limit },
    {
      headers: {
        // The CDN keys on the full URL, so offset/limit/sort/tag variants
        // cache independently. Kept short so new posts reach the infinite
        // scroll quickly; stale-while-revalidate hides the refresh.
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
