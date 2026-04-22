export const TIME_CATEGORIES = [
  { value: "half_day", label: "Half day", climbHours: 4, tripDays: 0.5 },
  { value: "one_day", label: "One day", climbHours: 8, tripDays: 1 },
  { value: "long_day", label: "A long day", climbHours: 12, tripDays: 1 },
  { value: "2_days", label: "2 days", climbHours: 16, tripDays: 2 },
  { value: "3_days", label: "3 days", climbHours: 24, tripDays: 3 },
  { value: "4_days", label: "4 days", climbHours: 32, tripDays: 4 },
] as const;

export type TimeCategory = (typeof TIME_CATEGORIES)[number]["value"];

export const ROCK_RATINGS = [
  { value: 1, label: "Class 1" },
  { value: 2, label: "Class 2" },
  { value: 3, label: "Class 3" },
  { value: 4, label: "Class 4" },
  { value: 10, label: "5.0" },
  { value: 11, label: "5.1" },
  { value: 12, label: "5.2" },
  { value: 13, label: "5.3" },
  { value: 14, label: "5.4" },
  { value: 15, label: "5.5" },
  { value: 20, label: "5.6" },
  { value: 30, label: "5.7" },
  { value: 40, label: "5.8" },
  { value: 50, label: "5.9" },
  { value: 60, label: "5.10a" },
  { value: 70, label: "5.10b" },
] as const;

export const GLACIER_RATINGS = [
  { value: "I", score: 1 },
  { value: "II", score: 2 },
  { value: "III", score: 3 },
] as const;

export type GlacierRating = (typeof GLACIER_RATINGS)[number]["value"];

export const OFF_TRAIL_RATIOS = [20, 40, 60, 80, 100] as const;

export function timeCategoryHours(value: string | null | undefined): number | null {
  const match = TIME_CATEGORIES.find((t) => t.value === value);
  return match ? match.climbHours : null;
}

export function timeCategoryDays(value: string | null | undefined): number | null {
  const match = TIME_CATEGORIES.find((t) => t.value === value);
  return match ? match.tripDays : null;
}

export function timeCategoryLabel(value: string | null | undefined): string | null {
  const match = TIME_CATEGORIES.find((t) => t.value === value);
  return match ? match.label : null;
}

export function rockRatingLabel(value: number | null | undefined): string | null {
  if (value == null) return null;
  const match = ROCK_RATINGS.find((r) => r.value === value);
  return match ? match.label : null;
}

// 5.0–5.5 (stored 10–15) all collapse to 10 for similarity; other grades pass through.
export function rockRatingScore(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (value >= 10 && value <= 15) return 10;
  return value;
}

export function glacierRatingScore(value: string | null | undefined): number | null {
  const match = GLACIER_RATINGS.find((g) => g.value === value);
  return match ? match.score : null;
}

// 40% off-trail → gain effectively counts 1.4× toward effort
export function effortGain(
  gainFt: number | null | undefined,
  offTrailRatioPct: number | null | undefined
): number | null {
  if (gainFt == null) return null;
  const pct = offTrailRatioPct ?? 0;
  return gainFt * (1 + pct / 100);
}
