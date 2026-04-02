import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { isNotNull, isNull } from "drizzle-orm";
import { posts } from "../src/db/schema";

const db = drizzle(neon(process.env.DATABASE_URL!));

async function main() {
  const mode = process.argv[2];

  if (mode === "--missing") {
    const rows = await db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(isNull(posts.peakbaggerUrl));
    for (const r of rows) {
      console.log(`${r.id} | ${r.title}`);
    }
    console.log(`\nTotal: ${rows.length} posts missing Peakbagger URLs`);
  } else {
    const rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        peakbaggerUrl: posts.peakbaggerUrl,
        viewCount: posts.viewCount,
      })
      .from(posts)
      .where(isNotNull(posts.peakbaggerUrl));
    for (const r of rows) {
      console.log(`${r.id} | ${r.title} | ${r.peakbaggerUrl} | views: ${r.viewCount}`);
    }
    console.log(`\nTotal: ${rows.length} posts with Peakbagger URLs`);
  }
}

main();
