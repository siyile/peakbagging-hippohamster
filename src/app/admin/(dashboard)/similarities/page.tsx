import { db } from "@/db";
import { posts, postSimilarities } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { scoreAllPairs } from "@/lib/recommendations";
import Link from "next/link";
import { RecomputeButton } from "./recompute-button";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ slug?: string }>;

export default async function AdminSimilaritiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { slug } = await searchParams;

  const allPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      tripDate: posts.tripDate,
      status: posts.status,
    })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(sql`${posts.tripDate} desc nulls last`);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Similarities</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a post to see its similarity score against every other
            published post. Rank shows its position in the stored top-10
            neighbors (—  if below the 0.3 threshold or outside the top 10).
          </p>
        </div>
        <RecomputeButton />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border">
          <div className="border-b bg-muted/50 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
            Posts
          </div>
          <ul className="max-h-[70vh] overflow-y-auto">
            {allPosts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/similarities?slug=${encodeURIComponent(p.slug)}`}
                  className={`block border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50 ${
                    p.slug === slug ? "bg-muted font-medium" : ""
                  }`}
                >
                  <div className="truncate">{p.title || p.slug}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.slug}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <section>
          {slug ? (
            <ScorePanel slug={slug} />
          ) : (
            <p className="text-muted-foreground">Select a post on the left.</p>
          )}
        </section>
      </div>
    </div>
  );
}

async function ScorePanel({ slug }: { slug: string }) {
  const [seed] = await db
    .select({ id: posts.id, title: posts.title, slug: posts.slug })
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);

  if (!seed) {
    return (
      <p className="text-muted-foreground">Post not found: {slug}</p>
    );
  }

  const [pairs, storedRows] = await Promise.all([
    scoreAllPairs(),
    db
      .select({
        neighborId: postSimilarities.neighborId,
        rank: postSimilarities.rank,
      })
      .from(postSimilarities)
      .where(eq(postSimilarities.postId, seed.id)),
  ]);

  const rankByNeighbor = new Map<number, number>();
  for (const r of storedRows) rankByNeighbor.set(r.neighborId, r.rank);

  // scoreAllPairs returns (seed -> cand) for every directed pair across all
  // published posts. We need rows whose seed is the selected post.
  const rows = pairs
    .filter((p) => p.seedId === seed.id)
    .map((p) => ({
      ...p,
      storedRank: rankByNeighbor.get(p.neighborId) ?? null,
    }))
    .sort((a, b) => b.score - a.score);

  const neighborIds = rows.map((r) => r.neighborId);
  const neighborPosts = neighborIds.length
    ? await db
        .select({ id: posts.id, slug: posts.slug })
        .from(posts)
        .where(inArray(posts.id, neighborIds))
    : [];
  const idBySlug = new Map<string, number>();
  for (const p of neighborPosts) idBySlug.set(p.slug, p.id);

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-semibold">{seed.title}</h2>
        <p className="text-xs text-muted-foreground">{seed.slug}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No other published posts.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium w-16">Rank</th>
                <th className="px-3 py-2 font-medium">Neighbor</th>
                <th className="px-3 py-2 font-medium text-right">Score</th>
                <th className="px-3 py-2 font-medium w-20">≥ 0.3</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const editId = idBySlug.get(r.neighborSlug);
                return (
                  <tr key={r.neighborId} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.storedRank ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {editId ? (
                        <Link
                          href={`/admin/posts/${editId}/edit`}
                          className="hover:underline"
                        >
                          {r.neighborTitle || r.neighborSlug}
                        </Link>
                      ) : (
                        r.neighborTitle || r.neighborSlug
                      )}
                      <div className="text-xs text-muted-foreground">
                        {r.neighborSlug}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.score.toFixed(4)}
                    </td>
                    <td className="px-3 py-2">
                      {r.score >= 0.3 ? (
                        <span className="text-xs font-medium text-foreground">
                          yes
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          no
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
