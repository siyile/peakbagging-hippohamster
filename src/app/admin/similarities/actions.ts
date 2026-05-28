"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { postSimilarities } from "@/db/schema";
import { computeAllSimilarities } from "@/lib/recommendations";

export async function recomputeSimilarities(): Promise<{
  rows: number;
  durationMs: number;
}> {
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

  revalidatePath("/admin/similarities");
  return { rows: rows.length, durationMs: Date.now() - start };
}
