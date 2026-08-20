import { db } from "@/db";
import { posts, tags, postTags } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Distinct tag names that have at least one published post, in the exact
 * casing stored on the tag row.
 *
 * Tag lookups are case-insensitive and some tags differ only by case
 * (scramble / Scramble), so results are deduped by lowercase name — otherwise
 * the same page is reachable at two URLs. The `tags` table also holds rows
 * with no published posts at all; those pages 404, so they must never reach
 * generateStaticParams or the sitemap.
 */
export async function getPublishedTagNames(): Promise<string[]> {
  const rows = await db
    .select({ name: tags.name })
    .from(tags)
    .innerJoin(postTags, eq(tags.id, postTags.tagId))
    .innerJoin(posts, eq(postTags.postId, posts.id))
    .where(eq(posts.status, "published"));

  const seen = new Set<string>();
  const names: string[] = [];
  for (const { name } of rows) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/**
 * The stored casing of a tag that has published posts, or null if there is no
 * such tag. Lookups are case-insensitive, so /tags/smoot and /tags/Smoot both
 * render; resolving the canonical name here keeps them from advertising two
 * different self-referencing canonical URLs for the same content.
 */
export async function getCanonicalTagName(name: string): Promise<string | null> {
  const [row] = await db
    .select({ name: tags.name })
    .from(tags)
    .innerJoin(postTags, eq(tags.id, postTags.tagId))
    .innerJoin(posts, eq(postTags.postId, posts.id))
    .where(
      and(eq(posts.status, "published"), sql`lower(${tags.name}) = ${name.toLowerCase()}`)
    )
    .limit(1);
  return row?.name ?? null;
}
