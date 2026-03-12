import { db } from "@/db";
import { posts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AdminPostsPage() {
  const allPosts = await db
    .select()
    .from(posts)
    .orderBy(desc(posts.updatedAt));

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
                  {new Date(post.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {post.tags?.map((tag) => (
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
