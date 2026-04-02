import { config } from "dotenv";
config({ path: ".env.local" });

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import fs from "fs/promises";

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

async function upload(buffer: Buffer, key: string, contentType: string) {
  await r2.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType })
  );
  return `${PUBLIC_URL}/${key}`;
}

async function main() {
  // about_us: 1264x1755, resize to 800px wide
  const aboutRaw = await fs.readFile("public/about_us.jpg");
  const aboutBuf = await sharp(aboutRaw)
    .resize(800, undefined, { withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  const aboutUrl = await upload(aboutBuf, "uploads/static/about_us.webp", "image/webp");
  console.log(`about_us: ${aboutBuf.length} bytes -> ${aboutUrl}`);

  // home_cover: 4433x1300, resize to 1600px wide
  const coverRaw = await fs.readFile("public/home_cover.JPEG");
  const coverBuf = await sharp(coverRaw)
    .resize(1600, undefined, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const coverUrl = await upload(coverBuf, "uploads/static/home_cover.webp", "image/webp");
  console.log(`home_cover: ${coverBuf.length} bytes -> ${coverUrl}`);
}

main();
