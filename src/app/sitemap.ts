import type { MetadataRoute } from "next";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { SITE_URL as BASE_URL } from "@/lib/constants";
import { getPublishedTagNames } from "@/lib/tags";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publishedPosts = await db
    .select({
      slug: posts.slug,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt));

  // Not every row in `tags` is a live page: orphan tags (no published posts)
  // 404, and case-duplicate rows resolve to the same page. Listing them all
  // sent Google after URLs that were never prerendered. Same source as the
  // tag page's generateStaticParams so the two can't drift.
  const tagNames = await getPublishedTagNames();

  const postEntries: MetadataRoute.Sitemap = publishedPosts.map((post) => ({
    url: `${BASE_URL}/posts/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const tagEntries: MetadataRoute.Sitemap = tagNames.map((name) => ({
    url: `${BASE_URL}/tags/${encodeURIComponent(name)}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [
    {
      url: BASE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/posts`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    ...postEntries,
    ...tagEntries,
  ];
}
