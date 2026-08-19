// Shape of the derivative ladder, plus the URL helpers that read it.
//
// Deliberately free of any sharp import: this module is pulled in by
// figure-image.ts, which runs inside the client-side editor bundle. The sharp
// half lives in image-pipeline.ts and must only be imported from server code.

// Inline ladder served with the article. Deliberately capped at 1600: the
// article column maxes out near 992px CSS (1400 container - 48 padding - 280
// sidebar - 32 gap - 48 body padding), so 1600 is an effective ~1.6x DPR. True
// full resolution is reserved for the lightbox, which fetches it only on click.
export const INLINE_WIDTHS = [640, 1024, 1600];

// The width the bare `src` points at, so existing URLs keep working unchanged.
export const DEFAULT_WIDTH = 1600;

// Bounds the long edge rather than the width, so tall portraits and panoramas
// don't balloon past what any screen can actually display.
export const FULL_LONG_EDGE = 3200;

export const FULL_SUFFIX = "-full";

export const IMAGE_SIZES =
  "(min-width: 1400px) 992px, (min-width: 768px) calc(100vw - 408px), 100vw";

// The hero sits flush in the article column with no body padding, so it is
// 48px wider than an inline figure at every breakpoint.
export const COVER_SIZES =
  "(min-width: 1400px) 1040px, (min-width: 768px) calc(100vw - 360px), 100vw";

// Feed-card and rail thumbnails. The card is a fixed 280px column on desktop
// but a full-bleed 100vw block on mobile, so the ladder spans a 280px slot at
// 1x through a ~400px slot at 3x.
//
// It stops at 960 deliberately. A 430 CSS px phone at DPR3 would "want" 1194,
// but a 1280 rung measures 161KB even at q50 — more than double what the
// optimizer serves today — to buy the step from 2.2x to 3.2x effective
// density, which is close to invisible on a photo.
//
// 960 is the trade worth making instead: measured across all 31 covers it
// averages 81.7KB against the 69.9KB a phone pulls today, so ~17% more bytes
// for 44% more pixels. Desktop is where the real win lands — a 1x display
// drops from 36.7KB to 16.3KB, because today it has no rung below 640.
export const THUMB_WIDTHS = [320, 640, 960];

// Unlike the inline ladder there is no bare rung: `-thumb.webp` already exists
// as the URL stored in coverImageThumb, and it predates this ladder. Leaving
// it untouched keeps that column valid, keeps it usable as the no-srcset `src`
// fallback, and means the backfill only ever adds keys — nothing is
// overwritten, so no CDN cache serves a rung whose width no longer matches its
// descriptor.
export function thumbLadderUrls(thumbUrl: string): string[] {
  return THUMB_WIDTHS.map((w) => withSuffix(thumbUrl, `-${w}`));
}

/**
 * srcset for the thumbnail ladder, derived from the stored `-thumb.webp` URL.
 *
 * This needs no database column, unlike the cover ladder: every cover source
 * is at least 1600px wide, so no thumb rung is ever capped by
 * withoutEnlargement and the nominal widths are always truthful. The backfill
 * asserts that per image before writing, and refuses any source that would
 * make a descriptor lie.
 */
export function thumbSrcset(thumbUrl: string): string {
  return THUMB_WIDTHS.map(
    (w) => `${withSuffix(thumbUrl, `-${w}`)} ${w}w`,
  ).join(", ");
}

// Served as a plain <img>, not through next/image, so this can state the real
// geometry. The bare-`100vw` restriction that applies to a next/image `sizes`
// prop (its getWidths only recognises an unwrapped NNNvw token) does not apply
// here — the browser parses this itself.
export const THUMB_SIZES = "(min-width: 768px) 280px, calc(100vw - 2rem)";

/** Insert a variant suffix before the file extension of a key or URL. */
export function withSuffix(pathOrUrl: string, suffix: string): string {
  if (!suffix) return pathOrUrl;
  const dot = pathOrUrl.lastIndexOf(".");
  if (dot === -1) return `${pathOrUrl}${suffix}`;
  return `${pathOrUrl.slice(0, dot)}${suffix}${pathOrUrl.slice(dot)}`;
}

/** The suffix used for a given inline width ("" for the default). */
export function suffixForWidth(width: number): string {
  return width === DEFAULT_WIDTH ? "" : `-${width}`;
}

/**
 * srcset covering the inline ladder only. The full variant is deliberately
 * excluded — if it were a candidate, a Retina desktop would pick it for the
 * inline image and undo the point of having a separate lightbox tier.
 *
 * Descriptors come from the widths actually rendered, not the nominal ladder:
 * `withoutEnlargement` caps a rung whenever the source is narrower than it
 * (common for portrait shots, where a 2048px-tall original is only 1536 wide),
 * and a `w` descriptor that overstates the file makes the browser pick that
 * rung for slots it can't actually fill. Rungs that collapse onto the same
 * width are deduped so a small source doesn't emit duplicate candidates.
 */
export function buildSrcset(
  baseUrl: string,
  rungs: { suffix: string; width: number }[],
): string {
  const seen = new Set<number>();
  return rungs
    .filter((r) => r.suffix !== FULL_SUFFIX)
    .sort((a, b) => a.width - b.width)
    .filter((r) => (seen.has(r.width) ? false : (seen.add(r.width), true)))
    .map((r) => `${withSuffix(baseUrl, r.suffix)} ${r.width}w`)
    .join(", ");
}

export function fullUrl(baseUrl: string): string {
  return withSuffix(baseUrl, FULL_SUFFIX);
}
