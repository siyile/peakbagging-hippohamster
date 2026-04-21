import { sql } from "drizzle-orm";
import { db } from "@/db";

export type SearchRow = {
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  coverImageThumb: string | null;
  tripDate: Date | null;
};

const TRGM_THRESHOLD = 0.2;

// Single query: title/description trigram hits first (stage 1),
// then content full-text hits (stage 2) for rows NOT already in stage 1.
// Sorting by stage then score gives stable pagination.
export async function searchPosts({
  q,
  offset,
  limit,
}: {
  q: string;
  offset: number;
  limit: number;
}): Promise<{ rows: SearchRow[]; hasMore: boolean }> {
  const like = `%${q}%`;
  const result = (await db.execute(sql`
    WITH title_hits AS (
      SELECT
        id, title, slug, description,
        cover_image       AS "coverImage",
        cover_image_thumb AS "coverImageThumb",
        trip_date         AS "tripDate",
        published_at,
        1 AS stage,
        GREATEST(
          similarity(title, ${q}),
          COALESCE(similarity(description, ${q}), 0) * 0.6
        ) AS score
      FROM posts
      WHERE status = 'published'
        AND (
          similarity(title, ${q}) > ${TRGM_THRESHOLD}
          OR title ILIKE ${like}
          OR COALESCE(similarity(description, ${q}), 0) > ${TRGM_THRESHOLD}
          OR description ILIKE ${like}
        )
    ),
    content_hits AS (
      SELECT
        p.id, p.title, p.slug, p.description,
        p.cover_image       AS "coverImage",
        p.cover_image_thumb AS "coverImageThumb",
        p.trip_date         AS "tripDate",
        p.published_at,
        2 AS stage,
        ts_rank(
          jsonb_to_tsvector('english', p.content, '["string"]'),
          websearch_to_tsquery('english', ${q})
        ) AS score
      FROM posts p
      WHERE p.status = 'published'
        AND NOT EXISTS (SELECT 1 FROM title_hits t WHERE t.id = p.id)
        AND jsonb_to_tsvector('english', p.content, '["string"]')
            @@ websearch_to_tsquery('english', ${q})
    )
    SELECT title, slug, description, "coverImage", "coverImageThumb", "tripDate"
    FROM (
      SELECT * FROM title_hits
      UNION ALL
      SELECT * FROM content_hits
    ) combined
    ORDER BY stage ASC, score DESC, published_at DESC NULLS LAST
    LIMIT ${limit + 1} OFFSET ${offset}
  `)) as unknown as { rows: SearchRow[] };

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
  return { rows, hasMore };
}
