// One-off: correct srcset width descriptors that were written from the nominal
// ladder instead of the width actually rendered.
//
// `withoutEnlargement` caps a rung whenever the source is narrower than it, so
// a portrait shot with a 1536px width got a "1600w" descriptor for a 1536px
// file. No image reprocessing is needed to fix it: the stored `width` attribute
// IS the default variant's real width, so every lower rung is exactly
// min(nominalWidth, storedWidth).
//
//   pnpm dlx tsx scripts/restamp-srcset.ts --dry-run
//   pnpm dlx tsx scripts/restamp-srcset.ts

import "./lib/env";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { posts } from "../src/db/schema";
import { INLINE_WIDTHS, buildSrcset, suffixForWidth } from "../src/lib/image-variants";

const DRY_RUN = process.argv.includes("--dry-run");

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

type Node = { type?: string; attrs?: Record<string, unknown>; content?: Node[] };

function imageNodes(doc: Node): Node[] {
  const out: Node[] = [];
  const walk = (n: Node) => {
    if (n.type === "image" && n.attrs?.src) out.push(n);
    n.content?.forEach(walk);
  };
  walk(doc);
  return out;
}

async function main() {
  const rows = await db
    .select({ id: posts.id, slug: posts.slug, content: posts.content })
    .from(posts);

  let checked = 0;
  let fixed = 0;
  let postsChanged = 0;

  for (const post of rows) {
    const doc = post.content as Node;
    let changed = 0;

    for (const node of imageNodes(doc)) {
      const attrs = node.attrs!;
      const width = Number(attrs.width);
      if (!attrs.srcset || !width) continue;
      checked++;

      const rungs = INLINE_WIDTHS.map((w) => ({
        suffix: suffixForWidth(w),
        width: Math.min(w, width),
      }));
      const corrected = buildSrcset(String(attrs.src), rungs);
      if (corrected === attrs.srcset) continue;

      console.log(`  ${post.slug} ${String(attrs.src).split("/").pop()}`);
      console.log(`    was: ${String(attrs.srcset).split(", ").pop()}`);
      console.log(`    now: ${corrected.split(", ").pop()}`);
      attrs.srcset = corrected;
      changed++;
      fixed++;
    }

    if (changed && !DRY_RUN) {
      await db
        .update(posts)
        .set({ content: doc as unknown as typeof posts.$inferInsert.content })
        .where(eq(posts.id, post.id));
    }
    if (changed) postsChanged++;
  }

  console.log(
    `\n${DRY_RUN ? "[dry run] " : ""}checked: ${checked}  corrected: ${fixed}  posts: ${postsChanged}`,
  );
  if (DRY_RUN) console.log("nothing written");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
