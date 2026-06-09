import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminViewsPage() {
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      tripDate: posts.tripDate,
      viewCount: posts.viewCount,
      status: posts.status,
    })
    .from(posts)
    .orderBy(desc(posts.viewCount), sql`${posts.updatedAt} desc`);

  const totalViews = rows.reduce((sum, r) => sum + r.viewCount, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Views</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} post{rows.length === 1 ? "" : "s"} · {totalViews.toLocaleString()} total views
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium w-12">#</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Trip date</th>
                <th className="px-4 py-2 font-medium text-right">Views</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/posts/${r.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {r.title || "Untitled"}
                    </Link>
                    <div className="text-xs text-muted-foreground">{r.slug}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                    {r.tripDate
                      ? new Date(r.tripDate).toLocaleDateString("en-US", {
                          timeZone: "UTC",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {r.viewCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <Badge
                      variant={r.status === "published" ? "default" : "secondary"}
                    >
                      {r.status}
                    </Badge>
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
