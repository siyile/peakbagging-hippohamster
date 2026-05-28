"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { scanOrphansAction, deleteOrphans } from "./actions";
import type { ScanResult } from "@/lib/r2-orphans";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Server actions serialize Date as string when returned to a client component,
// so the boundary type uses string for lastModified.
type ClientScanResult = Omit<ScanResult, "orphans"> & {
  orphans: Array<{ key: string; size: number; lastModified: string | null }>;
};

export function StoragePanel() {
  const [scan, setScan] = useState<ClientScanResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [scanning, startScan] = useTransition();
  const [deleting, startDelete] = useTransition();

  const runScan = () => {
    setStatus(null);
    setConfirming(false);
    startScan(async () => {
      const result = (await scanOrphansAction()) as unknown as ClientScanResult;
      setScan(result);
    });
  };

  const runDelete = () => {
    if (!scan) return;
    const keys = scan.orphans.map((o) => o.key);
    startDelete(async () => {
      const res = await deleteOrphans(keys);
      const skipped = res.skipped > 0 ? ` (${res.skipped} skipped)` : "";
      setStatus(`Deleted ${res.deleted} file${res.deleted === 1 ? "" : "s"}${skipped}.`);
      setConfirming(false);
      // Re-scan to reflect the new state.
      const fresh = (await scanOrphansAction()) as unknown as ClientScanResult;
      setScan(fresh);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runScan} disabled={scanning || deleting}>
          {scanning ? "Scanning…" : scan ? "Re-scan" : "Scan"}
        </Button>

        {scan && scan.orphans.length > 0 && !confirming && (
          <Button
            variant="destructive"
            onClick={() => {
              setStatus(null);
              setConfirming(true);
            }}
            disabled={scanning || deleting}
          >
            Delete {scan.orphans.length} file
            {scan.orphans.length === 1 ? "" : "s"} (
            {formatBytes(scan.orphans.reduce((s, o) => s + o.size, 0))})
          </Button>
        )}

        {confirming && (
          <>
            <span className="text-sm font-medium text-destructive">
              Permanently delete {scan?.orphans.length} file
              {scan?.orphans.length === 1 ? "" : "s"}? This cannot be undone.
            </span>
            <Button
              variant="destructive"
              onClick={runDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </>
        )}

        {status && (
          <span className="text-sm text-muted-foreground">{status}</span>
        )}
      </div>

      {scan && (
        <div className="text-sm text-muted-foreground">
          Scanned {scan.totalObjects} object
          {scan.totalObjects === 1 ? "" : "s"}.{" "}
          {scan.orphans.length === 0
            ? "All clean — no orphaned files."
            : `${scan.orphans.length} orphan${
                scan.orphans.length === 1 ? "" : "s"
              } (${formatBytes(
                scan.orphans.reduce((s, o) => s + o.size, 0)
              )}).`}
        </div>
      )}

      {scan && scan.orphans.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Key</th>
                <th className="px-4 py-2 font-medium">Size</th>
                <th className="px-4 py-2 font-medium">Last modified</th>
              </tr>
            </thead>
            <tbody>
              {scan.orphans.map((o) => (
                <tr key={o.key} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs break-all">
                    {o.key}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatBytes(o.size)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                    {o.lastModified
                      ? new Date(o.lastModified).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
