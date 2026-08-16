// One-off: regenerate the derivative ladder for every published post image
// from its local source photo, upload the variants to R2, archive the original,
// and stamp srcset/full/width/height into the post content JSON.
//
// The mapping file (deployed URL -> local source) is produced by the matching
// work described in the photo-source-library notes; each entry carries the
// source path plus the match distance that justified it.
//
// The regenerated default variant OVERWRITES the currently deployed .webp. For
// the handful of images whose published version was cropped, the new file is
// the uncropped original — that is intentional: the local file is ground truth.
//
//   pnpm dlx tsx scripts/backfill-image-variants.ts --dry-run
//   pnpm dlx tsx scripts/backfill-image-variants.ts --slug=chair-peak-ne-buttress
//   pnpm dlx tsx scripts/backfill-image-variants.ts --limit=5
//   pnpm dlx tsx scripts/backfill-image-variants.ts

// Must stay the first import: src/lib/r2 constructs its S3Client at module
// scope, so the env has to be populated before that module is evaluated.
import "./lib/env";

import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { posts } from "../src/db/schema";
import { uploadToR2 } from "../src/lib/r2";
import { buildImageVariants } from "../src/lib/image-pipeline";
import { buildSrcset, fullUrl, withSuffix } from "../src/lib/image-variants";
import { readDecodable } from "./lib/decode-source";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const arg = (name: string) =>
  args.find((a) => a.startsWith(`${name}=`))?.split("=").slice(1).join("=");

const ONLY_SLUG = arg("--slug");
const LIMIT = Number(arg("--limit") ?? Infinity);
const MAPPING_PATH =
  arg("--mapping") ?? `${process.env.USERPROFILE ?? "."}/Desktop/hippohamster-photo-mapping.json`;

const PUBLIC_BASE = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
const LEGACY_BASE = "https://pub-7aa6c67ec9294828987ab42d35f61c0f.r2.dev";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

type MappingEntry = { url: string; src: string | null; how?: string };
type Mapping = Record<string, MappingEntry[]>;

if (!existsSync(MAPPING_PATH)) {
  console.error(`mapping file not found: ${MAPPING_PATH}`);
  console.error("pass --mapping=<path> to point at it");
  process.exit(1);
}
const mapping: Mapping = JSON.parse(readFileSync(MAPPING_PATH, "utf8"));

// url -> local source, across every post (the same photo can appear in more
// than one post, e.g. the traverse reuses shots from the individual peaks).
const sourceByUrl = new Map<string, string>();
for (const entries of Object.values(mapping)) {
  for (const e of entries) if (e.src) sourceByUrl.set(e.url, e.src);
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

/** Bucket key for a deployed image URL, tolerating the pre-migration host. */
function keyFor(url: string): string | null {
  for (const base of [PUBLIC_BASE, LEGACY_BASE]) {
    if (url.startsWith(`${base}/`)) return url.slice(base.length + 1);
  }
  return null;
}

type ImageNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: ImageNode[];
};

/** Every image node in a TipTap document, in document order. */
function imageNodes(doc: ImageNode): ImageNode[] {
  const out: ImageNode[] = [];
  const walk = (n: ImageNode) => {
    if (n.type === "image" && n.attrs?.src) out.push(n);
    n.content?.forEach(walk);
  };
  walk(doc);
  return out;
}

// One photo can back several posts; only build and upload it once.
const doneByKey = new Map<
  string,
  { srcset: string; full: string; width: number; height: number }
>();

async function processImage(url: string, src: string) {
  const key = keyFor(url);
  if (!key) throw new Error(`unrecognised host: ${url}`);

  const cached = doneByKey.get(key);
  if (cached) return cached;

  const input = await readDecodable(src);
  const built = await buildImageVariants(input);

  const result = {
    srcset: buildSrcset(url, built.variants),
    full: fullUrl(url),
    width: built.width,
    height: built.height,
  };

  if (!DRY_RUN) {
    await Promise.all(
      built.variants.map((v) =>
        uploadToR2(v.buffer, withSuffix(key, v.suffix), "image/webp"),
      ),
    );
    // Archive the untouched source so a future ladder change is a batch job,
    // not another round of re-downloading originals from iCloud. HEIC is
    // stored as-is; it is the true original even though sharp can't read it.
    const ext = src.split(".").pop()!.toLowerCase();
    await uploadToR2(
      await readFile(src),
      `${withSuffix(`originals/${key}`, "").replace(/\.[^.]+$/, "")}.${ext}`,
      CONTENT_TYPES[ext] ?? "application/octet-stream",
    );
  }

  doneByKey.set(key, result);
  return result;
}

async function main() {
  const rows = await db
    .select({ id: posts.id, slug: posts.slug, content: posts.content })
    .from(posts);

  const targets = rows
    .filter((r) => (ONLY_SLUG ? r.slug === ONLY_SLUG : true))
    .filter((r) => mapping[r.slug]);

  if (ONLY_SLUG && !targets.length) {
    console.error(`no post matched --slug=${ONLY_SLUG}`);
    process.exit(1);
  }

  console.log(
    `${DRY_RUN ? "[dry run] " : ""}${targets.length} post(s), mapping: ${MAPPING_PATH}\n`,
  );

  let built = 0;
  let skipped = 0;
  let postsChanged = 0;

  for (const post of targets) {
    const doc = post.content as ImageNode;
    const nodes = imageNodes(doc);
    let changed = 0;

    for (const node of nodes) {
      if (built >= LIMIT) break;
      const url = String(node.attrs!.src);
      const src = sourceByUrl.get(url);
      if (!src) {
        skipped++;
        console.log(`  skip  ${url.split("/").pop()} (no mapped source)`);
        continue;
      }
      if (!existsSync(src)) {
        skipped++;
        console.log(`  skip  ${url.split("/").pop()} (source missing: ${src})`);
        continue;
      }

      try {
        const r = await processImage(url, src);
        node.attrs!.srcset = r.srcset;
        node.attrs!.full = r.full;
        node.attrs!.width = r.width;
        node.attrs!.height = r.height;
        changed++;
        built++;
        console.log(
          `  ok    ${url.split("/").pop()}  ${r.width}x${r.height}  <- ${src.split(/[\\/]/).pop()}`,
        );
      } catch (err) {
        skipped++;
        console.log(`  FAIL  ${url.split("/").pop()}: ${(err as Error).message}`);
      }
    }

    if (changed && !DRY_RUN) {
      await db
        .update(posts)
        .set({ content: doc as unknown as typeof posts.$inferInsert.content })
        .where(eq(posts.id, post.id));
    }
    if (changed) {
      postsChanged++;
      console.log(`${post.slug}: ${changed}/${nodes.length} updated\n`);
    }
    if (built >= LIMIT) break;
  }

  console.log(
    `\n${DRY_RUN ? "[dry run] " : ""}images built: ${built}  skipped: ${skipped}  posts updated: ${postsChanged}`,
  );
  if (DRY_RUN) console.log("nothing was uploaded or written");
  else console.log("run `pnpm build` or wait for revalidation to see changes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
