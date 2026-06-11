// Update posts.description from a review file of `slug:` / `ONPAGE:` pairs.
//
//   node scripts/update-descriptions.mjs [reviewFile]            # dry run
//   node scripts/update-descriptions.mjs [reviewFile] --apply    # write to DB
//
// Default reviewFile: scripts/seo-descriptions-review.md
// ONPAGE is stored verbatim in posts.description. The Google meta description is
// composed at render time as ONPAGE + " " + META_DESCRIPTION_SUFFIX (see
// src/lib/constants.ts), so do NOT include that tail here.
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
const pairs = [];
let slug = null;
for (const raw of text.split(/\r?\n/)) {
  const line = raw.trim();
  if (line.startsWith("slug:")) slug = line.slice(5).trim();
  else if (line.startsWith("ONPAGE:")) {
    const desc = line.slice(7).trim();
    if (slug && desc) pairs.push({ slug, desc });
    slug = null;
  }
}

if (pairs.length === 0) {
  console.error(`No slug/ONPAGE pairs found in ${reviewFile}`);
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
let changed = 0;
let problems = 0;

for (const { slug, desc } of pairs) {
  const rows = await sql`select description from posts where slug = ${slug} limit 1`;
  if (rows.length === 0) {
    console.log(`MISSING  ${slug}  (no such slug)`);
    problems++;
    continue;
  }
  const dash = /[‒–—―]/.test(desc) ? " DASH!" : "";
  if (dash) problems++;
  const same = rows[0].description === desc;
  console.log(
    `${same ? "same    " : "update  "}[${String(desc.length).padStart(3)}]${dash} ${slug}`
  );
  if (!same && apply) {
    await sql`update posts set description = ${desc}, updated_at = now() where slug = ${slug}`;
  }
  if (!same) changed++;
}

console.log(
  `\n${pairs.length} parsed | ${changed} ${apply ? "updated" : "to update"} | ${problems} problems`
);
if (!apply) console.log("Dry run. Re-run with --apply to write to the DB.");
