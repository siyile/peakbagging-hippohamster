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
