"use server";

import { revalidatePath } from "next/cache";
import {
  collectReferencedKeys,
  isProtectedKey,
  scanOrphans,
  type ScanResult,
} from "@/lib/r2-orphans";
import { deleteR2Keys } from "@/lib/r2";

export async function scanOrphansAction(): Promise<ScanResult> {
  return scanOrphans();
}

export async function deleteOrphans(
  keys: string[]
): Promise<{ deleted: number; skipped: number }> {
  if (keys.length === 0) return { deleted: 0, skipped: 0 };

  const referenced = await collectReferencedKeys();
  const safeKeys = keys.filter(
    (k) =>
      k.startsWith("uploads/") && !isProtectedKey(k) && !referenced.has(k)
  );
  const skipped = keys.length - safeKeys.length;

  const deleted = await deleteR2Keys(safeKeys);
  revalidatePath("/admin/storage");
  return { deleted, skipped };
}
