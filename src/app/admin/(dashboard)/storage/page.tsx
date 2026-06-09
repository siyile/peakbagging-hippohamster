import { StoragePanel } from "./storage-panel";

export const dynamic = "force-dynamic";

export default function AdminStoragePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Storage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan R2 for files under <code>uploads/</code> that no post references.
          Files under <code>uploads/static/</code> are excluded (used by the
          home and about pages).
        </p>
      </div>
      <StoragePanel />
    </div>
  );
}
