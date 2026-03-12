import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { jwtVerify } from "jose";

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

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "bin";
  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const url = await uploadToR2(buffer, key, file.type);

  return NextResponse.json({ url });
}
