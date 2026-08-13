import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { postSimilarities } from "@/db/schema";
import { computeAllSimilarities } from "@/lib/recommendations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const start = Date.now();
  const rows = await computeAllSimilarities();

  if (rows.length === 0) {
    await db.delete(postSimilarities);
  } else {
    await db.batch([
      db.delete(postSimilarities),
      db.insert(postSimilarities).values(rows),
    ]);
  }

  // Similarities feed the Recommended Climbs sidebar rendered into each
  // cached post page; revalidate them so the weekly page timer doesn't hold
  // yesterday's recommendations for days.
  revalidatePath("/posts/[slug]", "page");

  return NextResponse.json({
    ok: true,
    similarities: rows.length,
    durationMs: Date.now() - start,
  });
}
