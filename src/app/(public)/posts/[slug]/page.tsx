import { db } from "@/db";
import { posts, tags, postTags } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { FigureImage } from "@/lib/figure-image";
import TiptapLink from "@tiptap/extension-link";
import { FeaturedClimbs } from "@/components/featured-climbs";

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

  db.update(posts)
    .set({ viewCount: sql`view_count + 1` })
    .where(eq(posts.id, post.id))
    .execute();

  const postTagRows = await db
    .select({ name: tags.name })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.postId, post.id));
  const postTagNames = postTagRows.map((r) => r.name);

  const html = generateHTML(post.content as Parameters<typeof generateHTML>[0], [
    StarterKit,
    FigureImage,
    TiptapLink,
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_var(--featured-w,280px)] gap-0 md:gap-8">
    <article>
      {post.coverImage && (
        <img
          src={post.coverImage}
          alt={post.title}
          loading="eager"
          fetchPriority="high"
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
            <time>
              {new Date(post.tripDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
            <span>·</span>
            <span>by Siyi</span>
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
      <div
        className="prose dark:prose-invert max-w-none px-4 pt-0 pb-0 md:px-6 md:pt-6 text-black dark:text-white"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>

    <FeaturedClimbs excludeId={post.id} className="border-t border-gray-300 pt-4 px-4 md:px-0 md:border-t-0 md:pt-6" />
    </div>
  );
}
