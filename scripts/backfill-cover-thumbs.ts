import { config } from "dotenv";
config({ path: ".env.local" });

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, isNotNull, isNull } from "drizzle-orm";
import { posts } from "../src/db/schema";
import sharp from "sharp";

const DRY_RUN = process.argv.includes("--dry-run");

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

async function main() {
  const FORCE = process.argv.includes("--force");

  // Find posts with coverImage but no coverImageThumb (or all with --force)
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      coverImage: posts.coverImage,
    })
    .from(posts)
    .where(
      FORCE
        ? isNotNull(posts.coverImage)
        : and(isNotNull(posts.coverImage), isNull(posts.coverImageThumb))
    );

  console.log(`Found ${rows.length} posts to back-fill thumbnails for`);

  for (const row of rows) {
    const coverUrl = row.coverImage!;
    console.log(`\n[${row.id}] ${row.title}`);
    console.log(`  cover: ${coverUrl}`);

    try {
      // Fetch the existing cover image
      const res = await fetch(coverUrl);
      if (!res.ok) {
        console.error(`  SKIP: fetch failed ${res.status}`);
        continue;
      }

      const rawBuffer = Buffer.from(await res.arrayBuffer());

      // Generate thumbnail (400px wide)
      const thumbBuffer = await sharp(rawBuffer)
        .resize(800, undefined, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      // Derive the thumb key from the original URL
      // e.g. uploads/north-cascades/slug/1234-abc.webp -> uploads/north-cascades/slug/1234-abc-thumb.webp
      const urlPath = new URL(coverUrl).pathname.replace(/^\//, "");
      const thumbKey = urlPath.replace(/\.(\w+)$/, "-thumb.$1");

      console.log(`  thumb key: ${thumbKey} (${thumbBuffer.length} bytes)`);

      if (DRY_RUN) {
        console.log("  DRY RUN: skipping upload and DB update");
        continue;
      }

      const thumbUrl = await uploadToR2(thumbBuffer, thumbKey, "image/webp");
      console.log(`  thumb url: ${thumbUrl}`);

      // Update the DB
      await db
        .update(posts)
        .set({ coverImageThumb: thumbUrl })
        .where(eq(posts.id, row.id));

      console.log("  DB updated");
    } catch (err) {
      console.error(`  ERROR: ${err}`);
    }
  }

  console.log("\nDone!");
}

main();
