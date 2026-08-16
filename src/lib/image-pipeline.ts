// Server-side only — pulls in sharp, which must never reach the client bundle.
// Deliberately NOT guarded with `server-only`: scripts/backfill-image-variants
// imports this from plain Node, where that guard throws. The separation is
// structural instead — the client-safe half lives in image-variants.ts, and
// nothing under src/components may import this file.
import sharp from "sharp";
import {
  FULL_LONG_EDGE,
  FULL_SUFFIX,
  INLINE_WIDTHS,
  suffixForWidth,
} from "./image-variants";

// Quality-first by explicit choice: q80 runs roughly 20-40% heavier per file
// than a bandwidth-tuned q76, and that trade is deliberate. The responsive
// ladder is what protects load time here — a phone still pulls the 1024 rung,
// not this one — so spending the bytes buys fidelity without costing mobile.
const INLINE_QUALITY = 80;
// The lightbox is the whole point of the high-res work, so it gets the same
// quality rather than the discount a fit-to-screen view could tolerate.
const FULL_QUALITY = 80;
// Lanczos softens on reduction; this puts the edge back.
const SHARPEN_SIGMA = 0.5;

export type RenderedVariant = {
  /** "" for the default width, otherwise "-640" / "-1024" / "-full". */
  suffix: string;
  buffer: Buffer;
  width: number;
  height: number;
};

export type BuiltImage = {
  variants: RenderedVariant[];
  /** Dimensions of the default variant — what the width/height attrs carry. */
  width: number;
  height: number;
};

/**
 * Render the full derivative ladder from one decoded source buffer.
 *
 * The input must be something sharp can decode. HEIC is *not* decodable by the
 * bundled libheif (it parses the container but has no HEVC decoder), so callers
 * holding HEIC must transcode first — see scripts/lib/decode-source.ts.
 */
export async function buildImageVariants(input: Buffer): Promise<BuiltImage> {
  // One decode, cloned per output. `.rotate()` with no argument applies EXIF
  // orientation, which sharp does not do implicitly.
  const pipeline = sharp(input, { failOn: "none" }).rotate();

  const render = async (
    suffix: string,
    resize: sharp.ResizeOptions,
    quality: number,
  ): Promise<RenderedVariant> => {
    const { data, info } = await pipeline
      .clone()
      .resize({ withoutEnlargement: true, ...resize })
      .sharpen({ sigma: SHARPEN_SIGMA })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
    return { suffix, buffer: data, width: info.width, height: info.height };
  };

  // Sequential rather than parallel: a 24MP source held in four concurrent
  // pipelines is a lot of resident memory for a serverless function.
  const variants: RenderedVariant[] = [];
  for (const width of INLINE_WIDTHS) {
    variants.push(await render(suffixForWidth(width), { width }, INLINE_QUALITY));
  }
  variants.push(
    await render(
      FULL_SUFFIX,
      { width: FULL_LONG_EDGE, height: FULL_LONG_EDGE, fit: "inside" },
      FULL_QUALITY,
    ),
  );

  const def = variants.find((v) => v.suffix === "");
  if (!def) throw new Error("default variant missing from ladder");
  return { variants, width: def.width, height: def.height };
}
