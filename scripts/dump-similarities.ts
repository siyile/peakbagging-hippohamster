/**
 * Compute pairwise similarity scores across all published posts and write
 * them to a CSV file.
 *
 * Usage:
 *   npx tsx scripts/dump-similarities.ts [--output path/to/out.csv]
 *
 * Reads .env.local for DATABASE_URL. Output defaults to
 * scripts/similarities.csv.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { posts, tags, postTags } from "../src/db/schema";
import fs from "fs/promises";
import path from "path";

// ── DB ────────────────────────────────────────────────────────────────────────

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// ── Constants (from src/lib/constants.ts) ────────────────────────────────────

const LOCATION_TAGS = [
  "North Cascades",
  "Mountain Loop Highway",
  "Alpine Lakes Wilderness",
  "Olympic",
  "Mount Rainier National Park",
  "South Cascades",
  "Index Area",
] as const;

// ── Post-metadata helpers (from src/lib/post-metadata.ts) ────────────────────

const TIME_CATEGORIES = [
  { value: "half_day", climbHours: 4, tripDays: 0.5 },
  { value: "one_day", climbHours: 8, tripDays: 1 },
  { value: "long_day", climbHours: 12, tripDays: 1 },
  { value: "2_days", climbHours: 16, tripDays: 2 },
  { value: "3_days", climbHours: 24, tripDays: 3 },
  { value: "4_days", climbHours: 32, tripDays: 4 },
] as const;

const GLACIER_RATINGS = [
  { value: "I", score: 1 },
  { value: "II", score: 2 },
  { value: "III", score: 3 },
] as const;

const SNOW_RATINGS = [
  { value: "easy", score: 1 },
  { value: "moderate", score: 2 },
  { value: "steep", score: 3 },
] as const;

function timeCategoryHours(value: string | null | undefined): number | null {
  const match = TIME_CATEGORIES.find((t) => t.value === value);
  return match ? match.climbHours : null;
}

function timeCategoryDays(value: string | null | undefined): number | null {
  const match = TIME_CATEGORIES.find((t) => t.value === value);
  return match ? match.tripDays : null;
}

function rockRatingScore(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (value >= 10 && value <= 15) return 10; // 5.0–5.5 collapse to 10
  return value;
}

function glacierRatingScore(value: string | null | undefined): number | null {
  const match = GLACIER_RATINGS.find((g) => g.value === value);
  return match ? match.score : null;
}

function snowRatingScore(value: string | null | undefined): number | null {
  const match = SNOW_RATINGS.find((s) => s.value === value);
  return match ? match.score : null;
}

function effortGain(
  gainFt: number | null | undefined,
  offTrailRatioPct: number | null | undefined
): number | null {
  if (gainFt == null) return null;
  const pct = offTrailRatioPct ?? 0;
  return gainFt * (1 + pct / 100);
}

// ── Similarity algorithm (from src/lib/recommendations.ts) ───────────────────

const WEIGHTS = {
  location: 1.0,
  tag: 1.0,
  rock: 0.8,
  glacier: 0.8,
  snow: 0.8,
  skiTouring: 0.8,
  elevation: 0.4,
  effortGain: 0.2,
  offTrail: 0.2,
  distance: 0.2,
  climbHours: 0.2,
  tripDays: 0.2,
};

type NumericKey =
  | "elevation"
  | "effortGain"
  | "distance"
  | "climbHours"
  | "tripDays"
  | "rock"
  | "glacier"
  | "snow"
  | "offTrail";

const NUMERIC_WEIGHTS: Record<NumericKey, number> = {
  elevation: WEIGHTS.elevation,
  effortGain: WEIGHTS.effortGain,
  distance: WEIGHTS.distance,
  climbHours: WEIGHTS.climbHours,
  tripDays: WEIGHTS.tripDays,
  rock: WEIGHTS.rock,
  glacier: WEIGHTS.glacier,
  snow: WEIGHTS.snow,
  offTrail: WEIGHTS.offTrail,
};

const LOCATION_SET = new Set<string>(LOCATION_TAGS);

interface PostFeatures {
  id: number;
  slug: string;
  title: string;
  elevation: number | null;
  effortGain: number | null;
  distance: number | null;
  climbHours: number | null;
  tripDays: number | null;
  rock: number | null;
  glacier: number | null;
  snow: number | null;
  offTrail: number | null;
  isSkiTouring: boolean;
  tags: Set<string>;
  locations: Set<string>;
}

async function loadPostFeatures(): Promise<PostFeatures[]> {
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      elevationFt: posts.elevationFt,
      elevationGainFt: posts.elevationGainFt,
      distanceMiles: posts.distanceMiles,
      timeCategory: posts.timeCategory,
      rockRating: posts.rockRating,
      glacierRating: posts.glacierRating,
      snowRating: posts.snowRating,
      offTrailRatio: posts.offTrailRatio,
      isSkiTouring: posts.isSkiTouring,
    })
    .from(posts)
    .where(eq(posts.status, "published"));

  const tagRows = await db
    .select({ postId: postTags.postId, tagName: tags.name })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id));

  const tagsByPost = new Map<number, Set<string>>();
  const locationsByPost = new Map<number, Set<string>>();
  for (const t of tagRows) {
    const bucket = LOCATION_SET.has(t.tagName) ? locationsByPost : tagsByPost;
    let s = bucket.get(t.postId);
    if (!s) {
      s = new Set();
      bucket.set(t.postId, s);
    }
    s.add(t.tagName);
  }

  return rows.map((r): PostFeatures => {
    const distanceMiles =
      r.distanceMiles != null ? Number(r.distanceMiles) : null;
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      elevation: r.elevationFt,
      effortGain: effortGain(r.elevationGainFt, r.offTrailRatio),
      distance: distanceMiles,
      climbHours: timeCategoryHours(r.timeCategory),
      tripDays: timeCategoryDays(r.timeCategory),
      rock: rockRatingScore(r.rockRating),
      glacier: glacierRatingScore(r.glacierRating),
      snow: snowRatingScore(r.snowRating),
      offTrail: r.offTrailRatio,
      isSkiTouring: r.isSkiTouring,
      tags: tagsByPost.get(r.id) ?? new Set(),
      locations: locationsByPost.get(r.id) ?? new Set(),
    };
  });
}

function computeStats(
  all: PostFeatures[],
  key: NumericKey
): { mean: number; stddev: number } | null {
  const values = all.map((p) => p[key]).filter((v): v is number => v != null);
  if (values.length < 2) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return null;
  return { mean, stddev };
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const v of a) if (b.has(v)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function hasAnyFeature(p: PostFeatures): boolean {
  return (
    p.elevation != null ||
    p.effortGain != null ||
    p.distance != null ||
    p.climbHours != null ||
    p.rock != null ||
    p.glacier != null ||
    p.snow != null ||
    p.offTrail != null ||
    p.tags.size > 0 ||
    p.locations.size > 0
  );
}

function scorePair(
  seed: PostFeatures,
  cand: PostFeatures,
  statsByKey: Partial<Record<NumericKey, { mean: number; stddev: number }>>
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const k of Object.keys(NUMERIC_WEIGHTS) as NumericKey[]) {
    let sv = seed[k];
    let cv = cand[k];
    const st = statsByKey[k];
    if (!st) continue;

    // Rock/glacier/snow: if one post has a rating and the other doesn't, treat
    // the missing side as 0 so a route with that hazard isn't scored similar
    // to one without it.
    if (
      (k === "rock" || k === "glacier" || k === "snow") &&
      (sv != null || cv != null)
    ) {
      sv = sv ?? 0;
      cv = cv ?? 0;
    }

    if (sv == null || cv == null) continue;
    const dist = Math.abs(cv - sv) / st.stddev;
    const sim = Math.exp(-dist);
    weightedSum += NUMERIC_WEIGHTS[k] * sim;
    totalWeight += NUMERIC_WEIGHTS[k];
  }

  // Ski touring is always present (boolean), so always contribute.
  const skiSim = seed.isSkiTouring === cand.isSkiTouring ? 1 : 0;
  weightedSum += WEIGHTS.skiTouring * skiSim;
  totalWeight += WEIGHTS.skiTouring;

  if (seed.locations.size > 0 && cand.locations.size > 0) {
    weightedSum += WEIGHTS.location * jaccard(seed.locations, cand.locations);
    totalWeight += WEIGHTS.location;
  }

  if (seed.tags.size > 0 && cand.tags.size > 0) {
    weightedSum += WEIGHTS.tag * jaccard(seed.tags, cand.tags);
    totalWeight += WEIGHTS.tag;
  }

  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function csvEscape(v: string): string {
  if (v.includes('"') || v.includes(",") || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const outArg = process.argv.indexOf("--output");
  const outPath =
    outArg !== -1 && process.argv[outArg + 1]
      ? process.argv[outArg + 1]
      : path.join(__dirname, "similarities.csv");

  console.log("Loading post features...");
  const all = await loadPostFeatures();
  console.log(`  Loaded ${all.length} published posts`);

  // Compute per-feature stats across all posts
  const statsByKey: Partial<Record<NumericKey, { mean: number; stddev: number }>> = {};
  for (const k of Object.keys(NUMERIC_WEIGHTS) as NumericKey[]) {
    const s = computeStats(all, k);
    if (s) statsByKey[k] = s;
  }

  console.log("Scoring all pairs...");
  const rows: {
    seedSlug: string;
    seedTitle: string;
    neighborSlug: string;
    neighborTitle: string;
    score: number;
  }[] = [];

  for (const seed of all) {
    if (!hasAnyFeature(seed)) continue;
    for (const cand of all) {
      if (cand.id === seed.id) continue;
      rows.push({
        seedSlug: seed.slug,
        seedTitle: seed.title,
        neighborSlug: cand.slug,
        neighborTitle: cand.title,
        score: scorePair(seed, cand, statsByKey),
      });
    }
  }

  console.log(`  Scored ${rows.length} directed pairs`);

  // Sort by seed slug, then descending score
  rows.sort((a, b) => {
    const slugCmp = a.seedSlug.localeCompare(b.seedSlug);
    if (slugCmp !== 0) return slugCmp;
    return b.score - a.score;
  });

  // Write CSV
  const header = "seed_slug,seed_title,neighbor_slug,neighbor_title,score\n";
  const body = rows
    .map(
      (r) =>
        [
          csvEscape(r.seedSlug),
          csvEscape(r.seedTitle),
          csvEscape(r.neighborSlug),
          csvEscape(r.neighborTitle),
          r.score.toFixed(6),
        ].join(",")
    )
    .join("\n");

  await fs.writeFile(outPath, header + body, "utf-8");
  console.log(`\nWrote ${rows.length} rows to ${path.resolve(outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
