import Link from "next/link";
import { thumbSrcset, THUMB_SIZES } from "@/lib/image-variants";

export interface PostCard {
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  coverImageThumb: string | null;
  tripDate?: string | Date | null;
  author?: string | null;
}

// Deliberately not a client component: the static feeds render this on the
// server with no JS at all, while the search results list still pulls it into
// its bundle. A component with no hooks works in both places.
//
// One card for both breakpoints. This used to be two components rendered side
// by side and toggled with `hidden md:block` / `md:hidden`, which put every
// post in the DOM twice.
//
// Mobile stays `block` rather than `flex flex-col` on purpose: the cover is an
// inline replaced element there, and the line box it sits in contributes a few
// pixels of descender space above the title. Blockifying it as a flex item
// would silently tighten that gap.
export function FeedCard({ fp }: { fp: PostCard }) {
  return (
    <Link
      href={`/posts/${fp.slug}`}
      className="group block md:flex md:items-start md:gap-6"
    >
      {fp.coverImage && (
        /* eslint-disable-next-line @next/next/no-img-element -- pre-generated
           thumbnail ladder straight from R2. Routing it through the optimizer
           only re-encoded an already-sized webp, cost a proxy hop, and billed
           a transformation per rung. */
        <img
          src={fp.coverImageThumb || fp.coverImage}
          {...(fp.coverImageThumb && {
            srcSet: thumbSrcset(fp.coverImageThumb),
            sizes: THUMB_SIZES,
          })}
          alt={fp.title}
          // Not the file's real aspect — object-cover crops to this box. These
          // are the figures next/image reserved, so the card holds its space
          // before loading exactly as it did before.
          width={600}
          height={400}
          // Load-bearing now that the whole feed ships at once: only the cards
          // actually scrolled into view cost any image bandwidth, which is what
          // makes rendering every post nearly free.
          loading="lazy"
          decoding="async"
          // `md:order-last` moves the cover to the right of the text on
          // desktop while keeping the title first in the DOM. `order` is
          // inert in block flow, so mobile still stacks cover-then-title.
          className="w-full aspect-[3/2] object-cover rounded-md md:order-last md:w-[280px] md:shrink-0"
        />
      )}
      <div className="md:flex-1 md:min-w-0">
        <h3 className="text-xl font-semibold text-brand mt-1 md:mt-0 md:text-[27px]">
          {fp.title}
        </h3>
        {fp.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5 md:text-[20px]">
            {fp.description}
          </p>
        )}
        {fp.tripDate && (
          <p className="hidden md:block text-[16px] text-muted-foreground mt-1">
            {new Date(fp.tripDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}{" "}
            by {fp.author || "Siyi"}
          </p>
        )}
      </div>
    </Link>
  );
}
