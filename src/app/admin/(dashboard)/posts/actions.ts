"use server";

import { db } from "@/db";
import { posts, tags, postTags } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function syncPostTags(postId: number, tagNames: string[]) {
  // Delete existing post_tags
  await db.delete(postTags).where(eq(postTags.postId, postId));

  if (tagNames.length === 0) return;

  // Upsert tags
  await db
    .insert(tags)
    .values(tagNames.map((name) => ({ name })))
    .onConflictDoNothing();

  // Get tag IDs
  const tagRows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.name, tagNames));

  // Insert post_tags
  await db
    .insert(postTags)
    .values(tagRows.map((t) => ({ postId, tagId: t.id })));
}

export type PostFormData = {
  title: string;
  slug?: string;
  content: string;
  description?: string;
  metaDescription?: string;
  coverImage?: string;
  coverImageThumb?: string;
  coverImageSrcset?: string;
  coverImageFull?: string;
  tripDate?: string;
  gpxUrl?: string;
  caltopoUrl?: string;
  peakbaggerUrl?: string;
  nwsUrl?: string;
  elevationFt?: number | null;
  elevationGainFt?: number | null;
  distanceMiles?: number | null;
  timeCategory?: string | null;
  rockRating?: number | null;
  glacierRating?: string | null;
  snowRating?: string | null;
  offTrailRatio?: number | null;
  isSkiTouring?: boolean;
  author?: string;
  tags?: string[];
  status?: string;
};

export async function createPost(formData: PostFormData) {
  await requireAdmin();

  const slug = formData.slug?.trim() ?? "";
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      "Slug must be lowercase letters, numbers, and hyphens only (e.g. mount-rainier-traverse)"
    );
  }
  const isPublished = formData.status === "published";
  const content = JSON.parse(formData.content);

  const [post] = await db
    .insert(posts)
    .values({
      title: formData.title,
      slug,
      content,
      description: formData.description || null,
      metaDescription: formData.metaDescription || null,
      coverImage: formData.coverImage || null,
      coverImageThumb: formData.coverImageThumb || null,
      coverImageSrcset: formData.coverImageSrcset || null,
      coverImageFull: formData.coverImageFull || null,
      tripDate: formData.tripDate ? new Date(formData.tripDate) : null,
      gpxUrl: formData.gpxUrl || null,
      caltopoUrl: formData.caltopoUrl || null,
      peakbaggerUrl: formData.peakbaggerUrl || null,
      nwsUrl: formData.nwsUrl || null,
      elevationFt: formData.elevationFt ?? null,
      elevationGainFt: formData.elevationGainFt ?? null,
      distanceMiles:
        formData.distanceMiles != null ? String(formData.distanceMiles) : null,
      timeCategory: formData.timeCategory || null,
      rockRating: formData.rockRating ?? null,
      glacierRating: formData.glacierRating || null,
      snowRating: formData.snowRating || null,
      offTrailRatio: formData.offTrailRatio ?? null,
      isSkiTouring: formData.isSkiTouring ?? false,
      author: formData.author || "Siyi",
      status: formData.status || "draft",
      publishedAt: isPublished ? new Date() : null,
    })
    .returning();

  await syncPostTags(post.id, formData.tags || []);

  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/admin/posts");
  redirect(`/admin/posts/${post.id}/edit`);
}

export async function updatePost(id: number, formData: PostFormData) {
  await requireAdmin();

  const isPublished = formData.status === "published";
  const content = JSON.parse(formData.content);

  const [existing] = await db
    .select({ publishedAt: posts.publishedAt, slug: posts.slug })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  await db
    .update(posts)
    .set({
      title: formData.title,
      content,
      description: formData.description || null,
      metaDescription: formData.metaDescription || null,
      coverImage: formData.coverImage || null,
      coverImageThumb: formData.coverImageThumb || null,
      coverImageSrcset: formData.coverImageSrcset || null,
      coverImageFull: formData.coverImageFull || null,
      tripDate: formData.tripDate ? new Date(formData.tripDate) : null,
      gpxUrl: formData.gpxUrl || null,
      caltopoUrl: formData.caltopoUrl || null,
      peakbaggerUrl: formData.peakbaggerUrl || null,
      nwsUrl: formData.nwsUrl || null,
      elevationFt: formData.elevationFt ?? null,
      elevationGainFt: formData.elevationGainFt ?? null,
      distanceMiles:
        formData.distanceMiles != null ? String(formData.distanceMiles) : null,
      timeCategory: formData.timeCategory || null,
      rockRating: formData.rockRating ?? null,
      glacierRating: formData.glacierRating || null,
      snowRating: formData.snowRating || null,
      offTrailRatio: formData.offTrailRatio ?? null,
      isSkiTouring: formData.isSkiTouring ?? false,
      author: formData.author || "Siyi",
      status: formData.status || "draft",
      publishedAt:
        isPublished && !existing?.publishedAt
          ? new Date()
          : existing?.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  await syncPostTags(id, formData.tags || []);

  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/admin/posts");
  if (existing?.slug) revalidatePath(`/posts/${existing.slug}`);
}

export async function deletePost(id: number) {
  await requireAdmin();

  // Grab the slug first so the deleted post's cached page can be revalidated;
  // otherwise it keeps serving from the ISR cache until the weekly timer.
  const [existing] = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  await db.delete(posts).where(eq(posts.id, id));

  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/admin/posts");
  if (existing?.slug) revalidatePath(`/posts/${existing.slug}`);
  redirect("/admin/posts");
}
