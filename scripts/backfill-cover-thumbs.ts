// Build the feed/rail thumbnail ladder for every published post cover.
//
// The feed card and the Recommended Climbs rail render a plain <img> whose
// srcset is DERIVED from the stored coverImageThumb URL (see thumbSrcset), not
// stored per row. That means this script is what makes those URLs real: ship
// the component change before running this and every rung 404s, because a
// browser that picks a broken srcset candidate does not fall back to `src`.
// Run this FIRST, then deploy.
//
// Sources from coverImageFull (3200px long edge) when present, else the bare
// cover (1600px). Both are already-decoded webp, unlike the archived
// originals, which may be HEIC that sharp cannot decode. Every rung tops out
// at 1280, so either source clears it with room to spare.
//
// Purely additive: rung keys are new, and the bare -thumb.webp is only written
// when a post has none. Nothing is overwritten, so no CDN cache can end up
// serving a rung whose real width no longer matches its `w` descriptor.
//
//   pnpm dlx tsx scripts/backfill-cover-thumbs.ts --dry-run
//   pnpm dlx tsx scripts/backfill-cover-thumbs.ts --slug=chikamin-peak
//   pnpm dlx tsx scripts/backfill-cover-thumbs.ts --limit=5
//   pnpm dlx tsx scripts/backfill-cover-thumbs.ts

// Must stay the first import: src/lib/r2 constructs its S3Client at module
// scope, so the env has to be populated before that module is evaluated.
import "./lib/env";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, isNotNull, and } from "drizzle-orm";
import { posts } from "../src/db/schema";
import { uploadToR2 } from "../src/lib/r2";
import { buildThumbVariants, shortThumbRungs } from "../src/lib/image-pipeline";
import { THUMB_WIDTHS, withSuffix } from "../src/lib/image-variants";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const arg = (name: string) =>
  args.find((a) => a.startsWith(`${name}=`))?.split("=").slice(1).join("=");

const ONLY_SLUG = arg("--slug");
const LIMIT = Number(arg("--limit") ?? Infinity);

const PUBLIC_BASE = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
const LEGACY_BASE = "https://pub-7aa6c67ec9294828987ab42d35f61c0f.r2.dev";

const db = drizzle(neon(process.env.DATABASE_URL!));

/** Strip whichever public base a stored URL uses, leaving the R2 key. */
function keyFromUrl(url: string): string | null {
  for (const base of [PUBLIC_BASE, LEGACY_BASE]) {
    if (url.startsWith(`${base}/`)) return url.slice(base.length + 1).split("?")[0];
  }
  return null;
}

const kb = (n: number) => `${(n / 1024).toFixed(1)}KB`;

async function main() {
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      coverImage: posts.coverImage,
      coverImageThumb: posts.coverImageThumb,
      coverImageFull: posts.coverImageFull,
    })
    .from(posts)
    .where(and(eq(posts.status, "published"), isNotNull(posts.coverImage)));

  const targets = rows
    .filter((r) => !ONLY_SLUG || r.slug === ONLY_SLUG)
    .slice(0, LIMIT);

  console.log(
    `${targets.length} post(s) to process${DRY_RUN ? "  [DRY RUN — nothing will be written]" : ""}\n`,
  );

  let uploads = 0;
  let bytes = 0;
  let skipped = 0;

  for (const row of targets) {
    // Prefer the full variant: more pixels to downsample from means less
    // generational loss in the small rungs.
    const source = row.coverImageFull ?? row.coverImage!;
    // A post with no thumb yet needs the bare key invented from the cover.
    const thumbKey = row.coverImageThumb
      ? keyFromUrl(row.coverImageThumb)
      : keyFromUrl(row.coverImage!)?.replace(/\.(\w+)$/, "-thumb.$1") ?? null;

    if (!thumbKey) {
      console.log(`  SKIP ${row.slug}: cover URL is not on a known R2 base`);
      skipped++;
      continue;
    }

    process.stdout.write(`${row.slug}\n  source: ${source.split("/").pop()}\n`);

    let buf: Buffer;
    try {
      const res = await fetch(source);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.log(`  SKIP: fetch failed — ${err}`);
      skipped++;
      continue;
    }

    const variants = await buildThumbVariants(buf);
    const short = shortThumbRungs(variants);
    if (short.length > 0) {
      // The derived srcset hardcodes THUMB_WIDTHS, so a rung that came back
      // narrower would advertise a width it cannot fill and get picked for
      // slots it will look soft in. Refuse rather than publish the lie.
      console.log(
        `  SKIP: source too small — ${short
          .map((r) => `${r.nominal}w rendered ${r.actual}w`)
          .join(", ")}`,
      );
      skipped++;
      continue;
    }

    for (const v of variants) {
      const key = withSuffix(thumbKey, v.suffix);
      console.log(`    ${String(v.width).padStart(4)}w  ${kb(v.buffer.length).padStart(8)}  ${key}`);
      bytes += v.buffer.length;
      uploads++;
      if (!DRY_RUN) await uploadToR2(v.buffer, key, "image/webp");
    }

    // Only posts that never had a thumb need the bare key and a DB write;
    // existing bare thumbs are left exactly as they are.
    if (!row.coverImageThumb) {
      const top = variants[variants.length - 1];
      console.log(`    bare   ${kb(top.buffer.length).padStart(8)}  ${thumbKey}  (+ DB update)`);
      uploads++;
      bytes += top.buffer.length;
      if (!DRY_RUN) {
        const url = await uploadToR2(top.buffer, thumbKey, "image/webp");
        await db
          .update(posts)
          .set({ coverImageThumb: url })
          .where(eq(posts.id, row.id));
      }
    }
    console.log("");
  }

  console.log(
    `${DRY_RUN ? "Would upload" : "Uploaded"} ${uploads} object(s), ${kb(bytes)} total` +
      (skipped ? `, skipped ${skipped}` : "") +
      `\nLadder: ${THUMB_WIDTHS.join(", ")}`,
  );
}

main();
