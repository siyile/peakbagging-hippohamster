import { db } from "@/db";
import { posts } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

const BOT_UA = /bot|crawl|spider|preview|scan|fetch|monitor|headless|lighthouse/i;

export async function POST(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return new Response(null, { status: 204 });

  const slug = (await request.text()).trim();
  if (!slug || slug.length > 255) return new Response(null, { status: 400 });

  await db
    .update(posts)
    .set({ viewCount: sql`${posts.viewCount} + 1` })
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")));

  return new Response(null, { status: 204 });
}
