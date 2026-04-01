import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { jwtVerify } from "jose";
import sharp from "sharp";

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

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const isImage = file.type.startsWith("image/");

  let finalBuffer: Buffer;
  let contentType: string;
  let ext: string;

  if (isImage) {
    finalBuffer = await sharp(rawBuffer)
      .resize(1600, undefined, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    contentType = "image/webp";
    ext = "webp";
  } else {
    finalBuffer = rawBuffer;
    contentType = file.type;
    ext = file.name.split(".").pop() || "bin";
  }

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-");

  let prefix = "uploads";
  if (location && slug) {
    prefix = `uploads/${slugify(location)}/${slugify(slug)}`;
  }

  const key = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const url = await uploadToR2(finalBuffer, key, contentType);

  return NextResponse.json({ url });
}
