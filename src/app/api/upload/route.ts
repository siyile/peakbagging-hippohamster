import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { jwtVerify } from "jose";
import sharp from "sharp";
import {
  simplifyGpx,
  GPX_SIMPLIFY_TOLERANCE_KM,
  GPX_SIMPLIFY_MIN_BYTES,
} from "@/lib/gpx";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request: Request) {
  // Verify auth
  const cookieHeader = request.headers.get("cookie") || "";
  const tokenMatch = cookieHeader.match(/admin_token=([^;]+)/);
  const token = tokenMatch?.[1];

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await jwtVerify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const location = formData.get("location") as string | null;
  const slug = formData.get("slug") as string | null;
  const isCover = formData.get("cover") === "true";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const isImage = file.type.startsWith("image/");
  const fileExt = (file.name.split(".").pop() || "bin").toLowerCase();
  const isGpx = fileExt === "gpx";

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-");

  let prefix = "uploads";
  if (location && slug) {
    prefix = `uploads/${slugify(location)}/${slugify(slug)}`;
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (isImage) {
    const finalBuffer = await sharp(rawBuffer)
      .resize(1600, undefined, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const contentType = "image/webp";
    const key = `${prefix}/${id}.webp`;
    const url = await uploadToR2(finalBuffer, key, contentType);

    let thumbUrl: string | undefined;
    if (isCover) {
      const thumbBuffer = await sharp(rawBuffer)
        .resize(800, undefined, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      const thumbKey = `${prefix}/${id}-thumb.webp`;
      thumbUrl = await uploadToR2(thumbBuffer, thumbKey, contentType);
    }

    return NextResponse.json({ url, thumbUrl });
  }

  if (isGpx) {
    const contentType = "application/gpx+xml";
    const baseName = slug ? `${slugify(slug)}-hippohamster` : id;
    const key = `${prefix}/${baseName}.gpx`;
    if (rawBuffer.byteLength < GPX_SIMPLIFY_MIN_BYTES) {
      const url = await uploadToR2(rawBuffer, key, contentType);
      return NextResponse.json({ url });
    }
    const simplified = Buffer.from(
      simplifyGpx(rawBuffer.toString("utf-8"), GPX_SIMPLIFY_TOLERANCE_KM),
      "utf-8",
    );
    const originalKey = `${prefix}/${baseName}-original.gpx`;
    const [, url] = await Promise.all([
      uploadToR2(rawBuffer, originalKey, contentType),
      uploadToR2(simplified, key, contentType),
    ]);
    return NextResponse.json({ url });
  }

  const key = `${prefix}/${id}.${fileExt}`;
  const url = await uploadToR2(rawBuffer, key, file.type);
  return NextResponse.json({ url });
}
