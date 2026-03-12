import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import EditPostForm from "./edit-form";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = parseInt(id, 10);

  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) {
    notFound();
  }

  return <EditPostForm post={post} />;
}
