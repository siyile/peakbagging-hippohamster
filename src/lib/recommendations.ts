import { db } from "@/db";
import { posts, tags, postTags, postSimilarities } from "@/db/schema";
import { and, asc, desc, eq, notInArray } from "drizzle-orm";
import {
  timeCategoryHours,
  timeCategoryDays,
  glacierRatingScore,
  rockRatingScore,
  effortGain,
} from "./post-metadata";
import { LOCATION_TAGS } from "./constants";

export interface RecommendedPost {
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  coverImageThumb: string | null;
}

const LOCATION_SET = new Set<string>(LOCATION_TAGS);

const WEIGHTS = {
  location: 1.0,
  tag: 1.0,
  rock: 0.8,
  glacier: 0.8,
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
  | "offTrail";

const NUMERIC_WEIGHTS: Record<NumericKey, number> = {
  elevation: WEIGHTS.elevation,
  effortGain: WEIGHTS.effortGain,
  distance: WEIGHTS.distance,
  climbHours: WEIGHTS.climbHours,
  tripDays: WEIGHTS.tripDays,
  rock: WEIGHTS.rock,
  glacier: WEIGHTS.glacier,
  offTrail: WEIGHTS.offTrail,
};

const MIN_SCORE = 0.3;
const TOP_N = 10;

interface PostFeatures {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  coverImageThumb: string | null;
  viewCount: number;
  elevation: number | null;
  effortGain: number | null;
  distance: number | null;
  climbHours: number | null;
  tripDays: number | null;
  rock: number | null;
  glacier: number | null;
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
      description: posts.description,
      coverImage: posts.coverImage,
      coverImageThumb: posts.coverImageThumb,
      viewCount: posts.viewCount,
      elevationFt: posts.elevationFt,
      elevationGainFt: posts.elevationGainFt,
      distanceMiles: posts.distanceMiles,
      timeCategory: posts.timeCategory,
      rockRating: posts.rockRating,
      glacierRating: posts.glacierRating,
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
      description: r.description,
      coverImage: r.coverImage,
      coverImageThumb: r.coverImageThumb,
      viewCount: r.viewCount,
      elevation: r.elevationFt,
      effortGain: effortGain(r.elevationGainFt, r.offTrailRatio),
      distance: distanceMiles,
      climbHours: timeCategoryHours(r.timeCategory),
      tripDays: timeCategoryDays(r.timeCategory),
      rock: rockRatingScore(r.rockRating),
      glacier: glacierRatingScore(r.glacierRating),
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

    // Rock/glacier: if one post has a rating and the other doesn't, treat the
    // missing side as 0 (below Class 1 / Grade I) so a climb/glacier route is
    // not scored as similar to one without that hazard.
    if ((k === "rock" || k === "glacier") && (sv != null || cv != null)) {
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

export interface SimilarityRow {
  postId: number;
  neighborId: number;
  score: number;
  rank: number;
}

export async function computeAllSimilarities(): Promise<SimilarityRow[]> {
  const all = await loadPostFeatures();
  const statsByKey: Partial<
    Record<NumericKey, { mean: number; stddev: number }>
  > = {};
  for (const k of Object.keys(NUMERIC_WEIGHTS) as NumericKey[]) {
    const s = computeStats(all, k);
    if (s) statsByKey[k] = s;
  }

  const out: SimilarityRow[] = [];
  for (const seed of all) {
    if (!hasAnyFeature(seed)) continue;

    const scored = all
      .filter((p) => p.id !== seed.id)
      .map((cand) => ({ cand, score: scorePair(seed, cand, statsByKey) }))
      .filter((s) => s.score >= MIN_SCORE)
      .sort((a, b) =>
        b.score !== a.score
          ? b.score - a.score
          : b.cand.viewCount - a.cand.viewCount
      )
      .slice(0, TOP_N);

    scored.forEach(({ cand, score }, i) => {
      out.push({
        postId: seed.id,
        neighborId: cand.id,
        score,
        rank: i + 1,
      });
    });
  }
  return out;
}

async function popularFallback(
  limit: number,
  excludeIds: number[]
): Promise<RecommendedPost[]> {
  const where = excludeIds.length
    ? and(eq(posts.status, "published"), notInArray(posts.id, excludeIds))
    : eq(posts.status, "published");

  return db
    .select({
      title: posts.title,
      slug: posts.slug,
      description: posts.description,
      coverImage: posts.coverImage,
      coverImageThumb: posts.coverImageThumb,
    })
    .from(posts)
    .where(where)
    .orderBy(desc(posts.viewCount))
    .limit(limit);
}

export async function getRelatedPosts(
  slug: string,
  limit = 5
): Promise<RecommendedPost[]> {
  const [seed] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);

  if (!seed) return popularFallback(limit, []);

  const rows = await db
    .select({
      title: posts.title,
      slug: posts.slug,
      description: posts.description,
      coverImage: posts.coverImage,
      coverImageThumb: posts.coverImageThumb,
    })
    .from(postSimilarities)
    .innerJoin(posts, eq(posts.id, postSimilarities.neighborId))
    .where(
      and(
        eq(postSimilarities.postId, seed.id),
        eq(posts.status, "published")
      )
    )
    .orderBy(asc(postSimilarities.rank))
    .limit(limit);

  if (rows.length === 0) return popularFallback(limit, [seed.id]);

  return rows;
}
