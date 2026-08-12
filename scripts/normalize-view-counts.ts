import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, asc } from "drizzle-orm";
import { posts } from "../src/db/schema";

const db = drizzle(neon(process.env.DATABASE_URL!));

const divisor = Number(process.argv[2]);
if (!Number.isFinite(divisor) || divisor <= 0) {
  console.error("Usage: npx tsx scripts/normalize-view-counts.ts <divisor>");
  process.exit(1);
}

async function main() {
  const rows = await db
    .select({ id: posts.id, title: posts.title, viewCount: posts.viewCount })
    .from(posts)
    .orderBy(asc(posts.id));

  for (const row of rows) {
    const normalized = Math.round(row.viewCount / divisor);
    await db.update(posts).set({ viewCount: normalized }).where(eq(posts.id, row.id));
    console.log(`${row.id} | ${row.viewCount} -> ${normalized} | ${row.title}`);
  }
  console.log("\nDone! Normalized", rows.length, "posts.");
}

main();
