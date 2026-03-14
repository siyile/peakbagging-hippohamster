"use server";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export async function createPost(formData: {
  title: string;
  content: string;
  description?: string;
  coverImage?: string;
  tripDate?: string;
  gpxUrl?: string;
  caltopoUrl?: string;
  peakbaggerUrl?: string;
  nwsUrl?: string;

  tags?: string[];
  status?: string;
}) {
  const slug = slugify(formData.title);
  const isPublished = formData.status === "published";
  const content = JSON.parse(formData.content);

  const [post] = await db
    .insert(posts)
    .values({
      title: formData.title,
      slug,
      content,
      description: formData.description || null,
      coverImage: formData.coverImage || null,
      tripDate: formData.tripDate ? new Date(formData.tripDate) : null,
      gpxUrl: formData.gpxUrl || null,
      caltopoUrl: formData.caltopoUrl || null,
      peakbaggerUrl: formData.peakbaggerUrl || null,
      nwsUrl: formData.nwsUrl || null,

      tags: formData.tags || [],
      status: formData.status || "draft",
      publishedAt: isPublished ? new Date() : null,
    })
    .returning();

  revalidatePath("/");
  revalidatePath("/admin/posts");
  redirect(`/admin/posts/${post.id}/edit`);
}

export async function updatePost(
  id: number,
  formData: {
    title: string;
    content: string;
    description?: string;
    coverImage?: string;
    tripDate?: string;
    gpxUrl?: string;
    caltopoUrl?: string;
    peakbaggerUrl?: string;
    nwsUrl?: string;

    tags?: string[];
    status?: string;
  }
) {
  const slug = slugify(formData.title);
  const isPublished = formData.status === "published";
  const content = JSON.parse(formData.content);

  const [existing] = await db
    .select({ publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  await db
    .update(posts)
    .set({
      title: formData.title,
      slug,
      content,
      description: formData.description || null,
      coverImage: formData.coverImage || null,
      tripDate: formData.tripDate ? new Date(formData.tripDate) : null,
      gpxUrl: formData.gpxUrl || null,
      caltopoUrl: formData.caltopoUrl || null,
      peakbaggerUrl: formData.peakbaggerUrl || null,
      nwsUrl: formData.nwsUrl || null,

      tags: formData.tags || [],
      status: formData.status || "draft",
      publishedAt: isPublished && !existing?.publishedAt ? new Date() : existing?.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  revalidatePath("/");
  revalidatePath("/admin/posts");
  revalidatePath(`/posts/${slug}`);
}

export async function deletePost(id: number) {
  await db.delete(posts).where(eq(posts.id, id));

  revalidatePath("/");
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}
