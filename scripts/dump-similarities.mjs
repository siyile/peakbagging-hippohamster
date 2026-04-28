import { readFileSync, writeFileSync } from "node:fs";
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

const sql = neon(process.env.DATABASE_URL);

const rows = await sql`
  SELECT
    s.post_id,
    p.slug   AS post_slug,
    p.title  AS post_title,
    s.neighbor_id,
    n.slug   AS neighbor_slug,
    n.title  AS neighbor_title,
    s.score,
    s.rank
  FROM post_similarities s
  JOIN posts p ON p.id = s.post_id
  JOIN posts n ON n.id = s.neighbor_id
  ORDER BY s.post_id, s.rank
`;

const escape = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const header = [
  "post_id",
  "post_slug",
  "post_title",
  "neighbor_id",
  "neighbor_slug",
  "neighbor_title",
  "score",
  "rank",
];
const lines = [header.join(",")];
for (const r of rows) {
  lines.push(header.map((k) => escape(r[k])).join(","));
}

const out = process.argv[2];
if (!out) {
  console.error("usage: node scripts/dump-similarities.mjs <output.csv>");
  process.exit(1);
}
writeFileSync(out, lines.join("\n") + "\n");
console.log(`Wrote ${rows.length} rows to ${out}`);
