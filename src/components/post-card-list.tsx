import { FeedCard, type PostCard } from "@/components/post-card";

/**
 * The whole feed, server-rendered in one pass.
 *
 * This replaces an infinite-scroll client component on the three static feeds,
 * and the reason is scroll restoration. Pages past the first only ever existed
 * in that component's state, so leaving for a post destroyed them; the browser
 * then restored its saved offset against a document that had shrunk back to
 * ten cards and silently clamped it, dropping the reader at the bottom of page
 * one. Two attempts at re-hydrating that state — a sessionStorage snapshot and
 * an intercepting-route modal — both failed on the same fact: the document has
 * to be its full height before an offset means anything.
 *
 * Rendering every post makes the document permanently the right height, so
 * back navigation is just the browser doing its normal job. Measured at 31
 * posts it costs ~3.8KB gzipped over the ten-card version, roughly what the
 * two extra /api/posts round trips cost anyway, and the covers stay lazy so
 * nothing below the fold is fetched until it is scrolled to.
 *
 * The search page keeps InfinitePostCardList: its result count is unbounded
 * and unknown at request time, which is the case paging actually exists for.
 */
export function PostCardList({
  title,
  posts,
  className,
}: {
  title: string;
  posts: PostCard[];
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="md:pl-12">
        <h2 className="text-3xl font-semibold text-brand-grey mt-2 md:mt-0 md:text-[50px]">
          {title}
        </h2>
        <div className="mt-3 space-y-4 md:mt-4 md:space-y-6">
          {posts.map((fp) => (
            <FeedCard key={fp.slug} fp={fp} />
          ))}
        </div>
        {posts.length > 0 && (
          <p className="text-center text-muted-foreground py-6">
            — You&apos;ve reached the end —
          </p>
        )}
      </div>
    </div>
  );
}
