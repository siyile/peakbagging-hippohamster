import type { Metadata } from "next";
import { db } from "@/db";
import { posts, tags, postTags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { FigureImage } from "@/lib/figure-image";
import { PopularClimbs } from "@/components/popular-climbs";
import { getRelatedPosts } from "@/lib/recommendations";
import { PostMetadataBlock } from "@/components/post-metadata-block";
import { JsonLd } from "@/components/json-ld";
import { ViewTracker } from "@/components/view-tracker";
import { ArticleLightbox } from "@/components/article-lightbox";
import { META_DESCRIPTION_SUFFIX, SITE_URL } from "@/lib/constants";
import Image from "next/image";

// Each expiry re-renders the TipTap JSON through generateHTML — pure CPU — so
// keep the timer long: it's only a backstop. Content changes publish instantly
// via revalidatePath in updatePost/deletePost, and the daily similarities cron
// revalidates these pages after refreshing the Recommended Climbs data.
// Must stay a plain literal: segment config is statically analyzed.
export const revalidate = 604800; // 1 week

export async function generateStaticParams() {
  const rows = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(eq(posts.status, "published"));
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post] = await db
    .select({
      title: posts.title,
      description: posts.description,
      metaDescription: posts.metaDescription,
      coverImage: posts.coverImage,
    })
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);

  if (!post) return {};

  // The on-page subtitle uses the short post.description. Search engines get the
  // longer meta_description (falling back to description) plus a short tail.
  const metaBase = post.metaDescription ?? post.description;
  const metaDescription = metaBase
    ? `${metaBase} ${META_DESCRIPTION_SUFFIX}`
    : undefined;

  return {
    title: post.title,
    description: metaDescription,
    alternates: {
      canonical: `/posts/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: metaDescription,
      type: "article",
      ...(post.coverImage && {
        images: [{ url: post.coverImage, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      title: post.title,
      description: metaDescription,
      ...(post.coverImage && { images: [post.coverImage] }),
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);

  if (!post || post.status !== "published") {
    notFound();
  }

  const [postTagRows, related] = await Promise.all([
    db
      .select({ name: tags.name })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(eq(postTags.postId, post.id)),
    getRelatedPosts(post.slug, 5),
  ]);
  const postTagNames = postTagRows.map((r) => r.name);

  const html = generateHTML(post.content as Parameters<typeof generateHTML>[0], [
    StarterKit,
    FigureImage,
  ]);

  const postUrl = `${SITE_URL}/posts/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${postUrl}#article`,
        url: postUrl,
        mainEntityOfPage: postUrl,
        headline: post.title,
        description: post.metaDescription ?? post.description ?? undefined,
        ...(post.coverImage && { image: post.coverImage }),
        ...(post.tripDate && {
          datePublished: new Date(post.tripDate).toISOString(),
        }),
        dateModified: post.updatedAt.toISOString(),
        author: (post.author || "Siyi")
          .split(/,|\band\b/)
          .map((name) => ({ "@type": "Person", name: name.trim() }))
          .filter((p) => p.name),
        publisher: { "@id": `${SITE_URL}/#org` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Trip Reports",
            item: `${SITE_URL}/posts`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: postUrl,
          },
        ],
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_var(--featured-w,280px)] gap-0 md:gap-8">
    <JsonLd data={jsonLd} />
    <ViewTracker slug={post.slug} />
    <article>
      <ArticleLightbox>
      {post.coverImage && (
        <Image
          src={post.coverImage}
          alt={post.title}
          width={1200}
          height={480}
          priority
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI0ODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2UyZThlMCIvPjwvc3ZnPg=="
          className="w-full max-h-[480px] object-cover rounded-none md:rounded-xl mb-2 md:mb-0"
        />
      )}
      <header className="border-b px-4 pt-2 pb-2 md:px-6 md:pt-6 md:pb-6">
        {postTagNames.length > 0 && (
          <div className="mb-1 md:mb-3 flex flex-wrap items-center gap-2">
            {postTagNames.map((tag, i) => {
              const colors = [
                "bg-[#8ea885]",
                "bg-[#df7988]",
                "bg-[#0177b8]",
              ];
              return (
                <Link key={tag} href={`/tags/${tag}`}>
                  <Badge className={`rounded-[4px] px-4 py-2 text-sm text-white border-0 ${colors[i % colors.length]}`}>
                    {tag}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
        <h1 className="text-3xl font-bold my-1">{post.title}</h1>
        {post.description && (
          <p className="mt-0.5 text-muted-foreground text-base md:text-xl">{post.description}</p>
        )}
        {post.tripDate && (
          <div className="mt-1 md:mt-3 flex items-center gap-1.5 text-sm md:text-base text-muted-foreground">
            <time dateTime={new Date(post.tripDate).toISOString()}>
              {new Date(post.tripDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}
            </time>
            <span>·</span>
            <span>by {post.author || "Siyi"}</span>
          </div>
        )}
      </header>
      {(post.gpxUrl || post.caltopoUrl || post.peakbaggerUrl || post.nwsUrl) && (
        <div className="grid grid-cols-2 md:flex md:items-center gap-3 px-4 py-2 md:px-6 md:py-3 text-sm md:text-lg text-brand">
          {[
            post.gpxUrl && (
              <a key="gpx" href={post.gpxUrl} download className="hover:opacity-70 transition-opacity">
                Download GPX Track
              </a>
            ),
            post.caltopoUrl && (
              <a key="caltopo" href={post.caltopoUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                CalTopo Map
              </a>
            ),
            post.peakbaggerUrl && (
              <a key="pb" href={post.peakbaggerUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                Peakbagger.com
              </a>
            ),
            post.nwsUrl && (
              <a key="nws" href={post.nwsUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                National Weather Service
              </a>
            ),
          ]
            .filter(Boolean)
            .flatMap((link, i, arr) =>
              i < arr.length - 1 ? [link, <span key={`dot-${i}`} className="hidden md:inline">·</span>] : [link]
            )}
        </div>
      )}
      <PostMetadataBlock post={post} />
      <div
        className="prose dark:prose-invert max-w-none px-4 pt-0 pb-0 md:px-6 md:pt-6 text-black dark:text-white"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      </ArticleLightbox>
    </article>

    <PopularClimbs
      title="Recommended Climbs"
      posts={related}
      withPhotos
      className="mt-4 px-4 md:px-0 md:mt-0"
      endMarker="You've reached the end"
    />
    </div>
  );
}
