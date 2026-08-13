import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { postSimilarities } from "@/db/schema";
import { computeAllSimilarities } from "@/lib/recommendations";

function secureEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Fail closed when unset: comparing against `Bearer ${undefined}` would let
  // anyone through by sending the literal header "Bearer undefined".
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (!auth || !secureEquals(auth, `Bearer ${secret}`)) {
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
