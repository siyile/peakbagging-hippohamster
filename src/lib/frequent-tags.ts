import { db } from "@/db";
import { tags, postTags } from "@/db/schema";
import { eq, notInArray, sql } from "drizzle-orm";
import { LOCATION_TAGS } from "@/lib/constants";

export async function getFrequentTags(limit = 15): Promise<string[]> {
  const rows = await db
    .select({
      name: tags.name,
      count: sql<number>`count(*)::int`,
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(notInArray(tags.name, LOCATION_TAGS as unknown as string[]))
    .groupBy(tags.name)
    .orderBy(sql`count(*) desc`, tags.name)
    .limit(limit);

  return rows.map((r) => r.name);
}
