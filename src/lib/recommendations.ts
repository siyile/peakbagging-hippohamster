"use server";

import { db } from "@/db";
import { posts, tags, postTags } from "@/db/schema";
import { eq } from "drizzle-orm";
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

// Minimum average similarity a candidate must reach to be shown.
// Below this, recommendations fall back to popular posts.
const DEFAULT_MIN_SCORE = 0.3;

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

  const result = rows.map((r): PostFeatures => {
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

  return result;
}

function matchesTag(p: PostFeatures, tagFilter: string): boolean {
  const lower = tagFilter.toLowerCase();
  return (
    Array.from(p.tags).some((t) => t.toLowerCase() === lower) ||
    Array.from(p.locations).some((t) => t.toLowerCase() === lower)
  );
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

function centroid(seen: PostFeatures[]): {
  numeric: Partial<Record<NumericKey, number>>;
  skiTouringFrac: number | null;
  tagSet: Set<string>;
  locationSet: Set<string>;
} {
  const numeric: Partial<Record<NumericKey, number>> = {};
  const keys = Object.keys(NUMERIC_WEIGHTS) as NumericKey[];
  for (const k of keys) {
    const vals = seen.map((p) => p[k]).filter((v): v is number => v != null);
    if (vals.length > 0) {
      numeric[k] = vals.reduce((s, v) => s + v, 0) / vals.length;
    }
  }
  const tagSet = new Set<string>();
  const locationSet = new Set<string>();
  for (const p of seen) {
    for (const t of p.tags) tagSet.add(t);
    for (const l of p.locations) locationSet.add(l);
  }
  const skiTouringFrac = seen.length
    ? seen.filter((p) => p.isSkiTouring).length / seen.length
    : null;
  return { numeric, skiTouringFrac, tagSet, locationSet };
}

function hasAnyFeature(ps: PostFeatures[]): boolean {
  return ps.some(
    (p) =>
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

function toRecommendedPost(p: PostFeatures): RecommendedPost {
  return {
    title: p.title,
    slug: p.slug,
    description: p.description,
    coverImage: p.coverImage,
    coverImageThumb: p.coverImageThumb,
  };
}

export interface RecommendationsResult {
  posts: RecommendedPost[];
  isFallback: boolean;
}

export async function getRecommendations({
  seedSlugs,
  tagFilter,
  limit = 5,
  minScore = DEFAULT_MIN_SCORE,
}: {
  seedSlugs: string[];
  tagFilter?: string;
  limit?: number;
  minScore?: number;
}): Promise<RecommendationsResult> {
  const all = await loadPostFeatures();
  const seedSet = new Set(seedSlugs);
  const seen = all.filter((p) => seedSet.has(p.slug));
  const candidates = all.filter(
    (p) => !seedSet.has(p.slug) && (!tagFilter || matchesTag(p, tagFilter))
  );

  const popularFallback = (): RecommendationsResult => ({
    posts: candidates
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit)
      .map(toRecommendedPost),
    isFallback: true,
  });

  if (seen.length === 0 || !hasAnyFeature(seen)) {
    return popularFallback();
  }

  const statsByKey: Partial<
    Record<NumericKey, { mean: number; stddev: number }>
  > = {};
  for (const k of Object.keys(NUMERIC_WEIGHTS) as NumericKey[]) {
    const s = computeStats(all, k);
    if (s) statsByKey[k] = s;
  }

  const c = centroid(seen);

  const scored = candidates.map((cand) => {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const k of Object.keys(NUMERIC_WEIGHTS) as NumericKey[]) {
      const cVal = c.numeric[k];
      const candVal = cand[k];
      const st = statsByKey[k];
      if (cVal == null || candVal == null || !st) continue;
      const dist = Math.abs(candVal - cVal) / st.stddev;
      const sim = Math.exp(-dist);
      weightedSum += NUMERIC_WEIGHTS[k] * sim;
      totalWeight += NUMERIC_WEIGHTS[k];
    }

    if (c.skiTouringFrac != null) {
      const sim = 1 - Math.abs((cand.isSkiTouring ? 1 : 0) - c.skiTouringFrac);
      weightedSum += WEIGHTS.skiTouring * sim;
      totalWeight += WEIGHTS.skiTouring;
    }

    if (c.locationSet.size > 0 && cand.locations.size > 0) {
      let intersection = 0;
      for (const t of cand.locations) if (c.locationSet.has(t)) intersection++;
      const union = c.locationSet.size + cand.locations.size - intersection;
      const jaccard = union === 0 ? 0 : intersection / union;
      weightedSum += WEIGHTS.location * jaccard;
      totalWeight += WEIGHTS.location;
    }

    if (c.tagSet.size > 0 && cand.tags.size > 0) {
      let intersection = 0;
      for (const t of cand.tags) if (c.tagSet.has(t)) intersection++;
      const union = c.tagSet.size + cand.tags.size - intersection;
      const jaccard = union === 0 ? 0 : intersection / union;
      weightedSum += WEIGHTS.tag * jaccard;
      totalWeight += WEIGHTS.tag;
    }

    const score = totalWeight === 0 ? 0 : weightedSum / totalWeight;
    return { cand, score };
  });

  scored.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : b.cand.viewCount - a.cand.viewCount
  );

  const qualifying = scored.filter((s) => s.score >= minScore);
  if (qualifying.length === 0) {
    return popularFallback();
  }

  return {
    posts: qualifying.slice(0, limit).map((s) => toRecommendedPost(s.cand)),
    isFallback: false,
  };
}
