import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { FigureImage } from "@/lib/figure-image";
import TiptapLink from "@tiptap/extension-link";

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

  const html = generateHTML(post.content as Parameters<typeof generateHTML>[0], [
    StarterKit,
    FigureImage,
    TiptapLink,
  ]);

  return (
    <article>
      {post.coverImage && (
        <img
          src={post.coverImage}
          alt={post.title}
          className="w-full max-h-[480px] object-cover rounded-xl"
        />
      )}
      <header className="border-b px-6 pt-6 pb-6">
        {post.tags && post.tags.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            {post.tags.map((tag, i) => {
              const colors = [
                "bg-red-900 hover:bg-red-800 dark:bg-red-950 dark:hover:bg-red-900",
                "bg-blue-900 hover:bg-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900",
                "bg-green-900 hover:bg-green-800 dark:bg-green-950 dark:hover:bg-green-900",
                "bg-purple-900 hover:bg-purple-800 dark:bg-purple-950 dark:hover:bg-purple-900",
                "bg-amber-900 hover:bg-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900",
                "bg-pink-900 hover:bg-pink-800 dark:bg-pink-950 dark:hover:bg-pink-900",
                "bg-cyan-900 hover:bg-cyan-800 dark:bg-cyan-950 dark:hover:bg-cyan-900",
              ];
              return (
                <Link key={tag} href={`/tags/${tag}`}>
                  <Badge className={`rounded-md px-3 py-1 text-sm text-white border-0 ${colors[i % colors.length]}`}>
                    {tag}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
        <h1 className="text-3xl font-bold">{post.title}</h1>
        {post.description && (
          <p className="mt-1 text-muted-foreground text-xl">{post.description}</p>
        )}
        {post.tripDate && (
          <div className="mt-3 flex items-center gap-1.5 text-muted-foreground">
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
      {(post.gpxUrl || post.peakbaggerUrl || post.nwsUrl) && (
        <div className="flex items-center gap-3 px-6 py-3 text-lg text-[#0078A0]">
          {[
            post.gpxUrl && (
              <a key="gpx" href={post.gpxUrl} download className="hover:opacity-70 transition-opacity">
                Download GPX Track
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
              i < arr.length - 1 ? [link, <span key={`dot-${i}`}>·</span>] : [link]
            )}
        </div>
      )}
      <div
        className="prose dark:prose-invert max-w-none px-6 py-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {post.caltopoUrl && (
        <div className="px-6 py-3">
          <iframe
            src={post.caltopoUrl}
            className="w-full h-[500px] rounded-lg border"
            frameBorder="0"
          />
        </div>
      )}
    </article>
  );
}
