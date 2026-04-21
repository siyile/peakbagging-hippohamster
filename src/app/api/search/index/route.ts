import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts, tags, postTags } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const revalidate = 300;

export async function GET() {
  const rows = await db
    .select({
      title: posts.title,
      slug: posts.slug,
      description: posts.description,
      tags: sql<string[]>`coalesce(array_agg(${tags.name}) filter (where ${tags.name} is not null), '{}')`,
    })
    .from(posts)
    .leftJoin(postTags, eq(posts.id, postTags.postId))
    .leftJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(posts.status, "published"))
    .groupBy(posts.id);

  return NextResponse.json(
    { posts: rows },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
