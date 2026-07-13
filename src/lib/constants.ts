// Canonical production origin. Override per-environment with NEXT_PUBLIC_SITE_URL.
// Used for metadataBase, canonical URLs, sitemap, and robots.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hippohamster.com";

// Search-only tail appended to a post's clean description to build the Google
// meta description. Kept out of posts.description so it never shows on the page.
export const META_DESCRIPTION_SUFFIX = "Route beta and photos.";

export const AUTHOR_OPTIONS = ["Siyi", "Chutang", "Chutang and Siyi"] as const;
export const DEFAULT_AUTHOR = "Siyi";

export const LOCATION_TAGS = [
  "North Cascades",
  "Mountain Loop Highway",
  "Alpine Lakes Wilderness",
  "Olympic",
  "Mount Rainier National Park",
  "South Cascades",
  "Index Area",
] as const;
