// Update posts.description (DISPLAY) and posts.meta_description (META) from a
// review file of `slug:` / `DISPLAY:` / `META:` blocks.
//
//   node scripts/update-descriptions.mjs [reviewFile]            # dry run
//   node scripts/update-descriptions.mjs [reviewFile] --apply    # write to DB
//
// Default reviewFile: scripts/seo-descriptions-review.md
// DISPLAY -> posts.description  (short, shown on the site)
// META    -> posts.meta_description  (longer, Google meta only)
// The "Route beta and photos." search tail is appended at render time (see
// src/lib/constants.ts), so do NOT include it in META here.
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const envFile = readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const reviewFile =
  args.find((a) => !a.startsWith("--")) ?? "scripts/seo-descriptions-review.md";

const text = readFileSync(reviewFile, "utf8");
const blocks = [];
let cur = null;
for (const raw of text.split(/\r?\n/)) {
  const line = raw.trim();
  if (line.startsWith("slug:")) {
    cur = { slug: line.slice(5).trim(), display: null, meta: null };
    blocks.push(cur);
  } else if (cur && line.startsWith("DISPLAY:")) {
    cur.display = line.slice(8).trim();
  } else if (cur && line.startsWith("META:")) {
    cur.meta = line.slice(5).trim();
  }
}

if (blocks.length === 0) {
  console.error(`No slug blocks found in ${reviewFile}`);
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
let changed = 0;
let problems = 0;

for (const { slug, display, meta } of blocks) {
  const rows = await sql`
    select description, meta_description from posts where slug = ${slug} limit 1`;
  if (rows.length === 0) {
    console.log(`MISSING  ${slug}`);
    problems++;
    continue;
  }
  const metaDash = meta && /[‒–—―]/.test(meta) ? " META-DASH!" : "";
  if (metaDash) problems++;
  const dispChanged = display != null && rows[0].description !== display;
  const metaChanged = meta != null && rows[0].meta_description !== meta;
  const flags = [
    dispChanged ? `disp[${display.length}]` : "disp ok ",
    metaChanged ? `meta[${meta.length}]` : "meta ok ",
  ].join(" ");
  console.log(`${flags}${metaDash}  ${slug}`);
  if (apply && (dispChanged || metaChanged)) {
    await sql`
      update posts
      set description = ${display},
          meta_description = ${meta},
          updated_at = now()
      where slug = ${slug}`;
  }
  if (dispChanged || metaChanged) changed++;
}

console.log(
  `\n${blocks.length} blocks | ${changed} ${apply ? "updated" : "to update"} | ${problems} problems`
);
if (!apply) console.log("Dry run. Re-run with --apply to write to the DB.");
