import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq, arrayContains } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);

  const tagPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .where(arrayContains(posts.tags, [decoded]))
    .orderBy(desc(posts.publishedAt));

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <h1 className="text-3xl font-bold">Posts tagged</h1>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {decoded}
        </Badge>
      </div>

      <Link href="/" className="mb-6 inline-block text-sm text-muted-foreground underline">
        ← All posts
      </Link>

      {tagPosts.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No posts with this tag.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {tagPosts.map((post) => (
            <article key={post.id}>
              <Link href={`/posts/${post.slug}`}>
                <h2 className="text-xl font-semibold hover:underline">
                  {post.title}
                </h2>
              </Link>
              {post.description && (
                <p className="mt-1 text-muted-foreground">{post.description}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                {post.publishedAt && (
                  <time className="text-sm text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </time>
                )}
                {post.tags?.map((t) => (
                  <Link key={t} href={`/tags/${t}`}>
                    <Badge variant="outline" className="cursor-pointer">
                      {t}
                    </Badge>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
