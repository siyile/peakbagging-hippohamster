import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { jwtVerify } from "jose";
import sharp from "sharp";
import { buildImageVariants, COVER_QUALITY } from "@/lib/image-pipeline";
import { buildSrcset, fullUrl, withSuffix } from "@/lib/image-variants";
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
    // The bundled libheif parses HEIC containers but has no HEVC decoder, so
    // sharp will fail on the actual decode. Say so plainly instead of 500ing.
    let format: string | undefined;
    try {
      format = (await sharp(rawBuffer).metadata()).format;
    } catch {
      return NextResponse.json({ error: "Unreadable image file" }, { status: 400 });
    }
    if (format === "heif") {
      return NextResponse.json(
        {
          error:
            "HEIC images can't be processed here. Export as JPEG first, or run scripts/backfill-image-variants.ts locally (it transcodes HEIC via ffmpeg).",
        },
        { status: 415 },
      );
    }

    const contentType = "image/webp";
    const key = `${prefix}/${id}.webp`;

    // Covers are the hero and the LCP element, so they get a quality bump.
    const built = await buildImageVariants(
      rawBuffer,
      isCover ? { inlineQuality: COVER_QUALITY, fullQuality: COVER_QUALITY } : {},
    );
    const uploaded = await Promise.all(
      built.variants.map(async (v) => ({
        suffix: v.suffix,
        url: await uploadToR2(v.buffer, withSuffix(key, v.suffix), contentType),
      })),
    );
    const url = uploaded.find((u) => u.suffix === "")!.url;

    // Keep the untouched upload so a future ladder change (another rung, AVIF,
    // a quality retune) is a batch job over R2 instead of a re-upload.
    await uploadToR2(rawBuffer, `originals/${prefix}/${id}.${fileExt}`, file.type);

    let thumbUrl: string | undefined;
    if (isCover) {
      const thumbBuffer = await sharp(rawBuffer)
        .rotate()
        .resize(800, undefined, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      const thumbKey = `${prefix}/${id}-thumb.webp`;
      thumbUrl = await uploadToR2(thumbBuffer, thumbKey, contentType);
    }

    return NextResponse.json({
      url,
      thumbUrl,
      srcset: buildSrcset(url, built.variants),
      full: fullUrl(url),
      width: built.width,
      height: built.height,
    });
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
