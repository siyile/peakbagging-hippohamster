import type { MetadataRoute } from "next";
import { db } from "@/db";
import { posts, tags } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const BASE_URL = "https://hippohamster.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publishedPosts = await db
    .select({
      slug: posts.slug,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt));

  const allTags = await db.select({ name: tags.name }).from(tags);

  const postEntries: MetadataRoute.Sitemap = publishedPosts.map((post) => ({
    url: `${BASE_URL}/posts/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const tagEntries: MetadataRoute.Sitemap = allTags.map((tag) => ({
    url: `${BASE_URL}/tags/${encodeURIComponent(tag.name)}`,
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
