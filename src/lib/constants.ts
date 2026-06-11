// Canonical production origin. Override per-environment with NEXT_PUBLIC_SITE_URL.
// Used for metadataBase, canonical URLs, sitemap, and robots.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hippohamster.com";

export const LOCATION_TAGS = [
  "North Cascades",
  "Mountain Loop Highway",
  "Alpine Lakes Wilderness",
  "Olympic",
  "Mount Rainier National Park",
  "South Cascades",
  "Index Area",
] as const;
