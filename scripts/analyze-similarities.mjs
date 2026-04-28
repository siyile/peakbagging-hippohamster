import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const envFile = readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const sql = neon(process.env.DATABASE_URL);

// Unique pair view: dedupe (A,B)/(B,A) by keeping LEAST/GREATEST.
// For a pair we may have 0, 1, or 2 directional rows stored.
//   both_dirs = 2 → reciprocal (A has B and B has A)
//   both_dirs = 1 → one-way (only one direction survived the per-seed top-10 cut)
const topPairs = await sql`
  WITH pair AS (
    SELECT
      LEAST(post_id, neighbor_id)    AS a,
      GREATEST(post_id, neighbor_id) AS b,
      score,
      rank
    FROM post_similarities
  ),
  agg AS (
    SELECT a, b,
           MAX(score)::real AS score,
           COUNT(*)::int    AS both_dirs,
           MIN(rank)::int   AS best_rank,
           MAX(rank)::int   AS worst_rank
    FROM pair
    GROUP BY a, b
  )
  SELECT agg.score, agg.both_dirs, agg.best_rank, agg.worst_rank,
         pa.slug AS a_slug, pa.title AS a_title,
         pb.slug AS b_slug, pb.title AS b_title
  FROM agg
  JOIN posts pa ON pa.id = agg.a
  JOIN posts pb ON pb.id = agg.b
  ORDER BY agg.score DESC
  LIMIT 10
`;

const bottomPairs = await sql`
  WITH pair AS (
    SELECT
      LEAST(post_id, neighbor_id)    AS a,
      GREATEST(post_id, neighbor_id) AS b,
      score,
      rank
    FROM post_similarities
  ),
  agg AS (
    SELECT a, b,
           MAX(score)::real AS score,
           COUNT(*)::int    AS both_dirs,
           MIN(rank)::int   AS best_rank,
           MAX(rank)::int   AS worst_rank
    FROM pair
    GROUP BY a, b
  )
  SELECT agg.score, agg.both_dirs, agg.best_rank, agg.worst_rank,
         pa.slug AS a_slug, pa.title AS a_title,
         pb.slug AS b_slug, pb.title AS b_title
  FROM agg
  JOIN posts pa ON pa.id = agg.a
  JOIN posts pb ON pb.id = agg.b
  ORDER BY agg.score ASC
  LIMIT 10
`;

function fmt(rows) {
  for (const r of rows) {
    const dir = r.both_dirs === 2 ? "↔" : "→";
    const rankNote =
      r.both_dirs === 2
        ? `ranks ${r.best_rank}/${r.worst_rank}`
        : `rank ${r.best_rank} (one-way)`;
    console.log(
      `  ${r.score.toFixed(4)}  ${rankNote.padEnd(20)}  "${r.a_title}" ${dir} "${r.b_title}"`
    );
    console.log(`                                  ${r.a_slug} ${dir} ${r.b_slug}`);
  }
}

console.log("=== TOP 10 STRONGEST UNIQUE PAIRS ===");
fmt(topPairs);
console.log();
console.log("=== BOTTOM 10 WEAKEST UNIQUE PAIRS (stored) ===");
fmt(bottomPairs);
