import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { posts } from "../src/db/schema";

const db = drizzle(neon(process.env.DATABASE_URL!));

// Mapping: post ID -> { peakbaggerUrl (if missing), viewCount }
const updates: { id: number; peakbaggerUrl?: string; viewCount: number }[] = [
  { id: 25, viewCount: 66 },   // Cannon Mountain — aid=2982497
  { id: 26, viewCount: 103 },  // Chair Peak — aid=2918713
  { id: 27, viewCount: 106 },  // Chikamin Peak — aid=2938170 (use higher count)
  { id: 28, viewCount: 37 },   // Huckleberry Mountain — aid=2938168
  { id: 29, viewCount: 146 },  // Kaleetan Peak — aid=2667026
  { id: 30, viewCount: 29 },   // McClellan Butte — aid=2949654
  { id: 31, viewCount: 67 },   // Mount Thompson — aid=2938165
  { id: 32, viewCount: 106 },  // Snoqualmie Pass North Traverse — shares Chikamin aid=2938170
  { id: 33, viewCount: 81 },   // Gunn Peak — aid=2990924
  { id: 34, viewCount: 26 },   // Boundary Peak — aid=2862448
  { id: 35, viewCount: 40 },   // Cowlitz Chimneys — aid=2959758
  { id: 36, viewCount: 53 },   // White Chuck Mountain — aid=2928731
  { id: 37, viewCount: 31, peakbaggerUrl: "https://www.peakbagger.com/climber/ascent.aspx?aid=3006190" },  // Big Craggy
  { id: 38, viewCount: 147, peakbaggerUrl: "https://www.peakbagger.com/climber/ascent.aspx?aid=2674254" }, // Black Peak
  { id: 39, viewCount: 137 },  // North Gardner Mountain — aid=2872108
  { id: 40, viewCount: 51, peakbaggerUrl: "https://www.peakbagger.com/climber/ascent.aspx?aid=2998899" },  // Tomyhoi Peak
  { id: 41, viewCount: 105 },  // Gilbert Peak — aid=2967874
  { id: 42, viewCount: 37 },   // Ives Peak — aid=2967872
];

async function main() {
  for (const u of updates) {
    const set: Record<string, unknown> = { viewCount: u.viewCount };
    if (u.peakbaggerUrl) set.peakbaggerUrl = u.peakbaggerUrl;

    await db.update(posts).set(set).where(eq(posts.id, u.id));
    console.log(`${u.id} | viewCount: ${u.viewCount}${u.peakbaggerUrl ? " | + peakbagger URL" : ""}`);
  }
  console.log("\nDone! Updated", updates.length, "posts.");
}

main();
