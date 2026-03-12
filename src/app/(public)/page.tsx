import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function HomePage() {
  const allPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt));

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">Posts</h1>

      {allPosts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="space-y-8">
          {allPosts.map((post) => (
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
