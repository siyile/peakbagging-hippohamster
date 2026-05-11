import { db } from "@/db";
import { posts, tags, postTags } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AdminPostsPage() {
  const allPosts = await db
    .select()
    .from(posts)
    .orderBy(sql`${posts.tripDate} desc nulls last`, sql`${posts.updatedAt} desc`);

  // Fetch all post-tag mappings in one query
  const allPostTags = await db
    .select({ postId: postTags.postId, name: tags.name })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id));

  const tagsByPostId = new Map<number, string[]>();
  for (const pt of allPostTags) {
    if (!tagsByPostId.has(pt.postId)) tagsByPostId.set(pt.postId, []);
    tagsByPostId.get(pt.postId)!.push(pt.name);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link href="/admin/posts/new">
          <Button>New Post</Button>
        </Link>
      </div>

      {allPosts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet. Create your first one!</p>
      ) : (
        <div className="space-y-3">
          {allPosts.map((post) => (
            <Link
              key={post.id}
              href={`/admin/posts/${post.id}/edit`}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
            >
              <div>
                <h2 className="font-medium">{post.title || "Untitled"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Trip:{" "}
                  {post.tripDate
                    ? new Date(post.tripDate).toLocaleDateString("en-US", {
                        timeZone: "UTC",
                      })
                    : "—"}
                  {" · "}
                  Updated: {new Date(post.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {tagsByPostId.get(post.id)?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
                <Badge
                  variant={post.status === "published" ? "default" : "secondary"}
                >
                  {post.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
