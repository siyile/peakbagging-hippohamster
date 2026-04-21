import { NextResponse } from "next/server";
import { searchPosts } from "@/lib/search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "10", 10),
    50
  );

  if (!q) {
    return NextResponse.json({ posts: [], hasMore: false });
  }

  const { rows, hasMore } = await searchPosts({ q, offset, limit });
  return NextResponse.json({ posts: rows, hasMore });
}
