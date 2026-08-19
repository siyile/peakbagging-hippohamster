import Link from "next/link";
import Image from "next/image";

interface PopularPost {
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  coverImageThumb: string | null;
}

export function PopularClimbs({
  title = "Most Popular Climbs",
  posts,
  withPhotos = false,
  className,
  endMarker,
}: {
  title?: string;
  posts: PopularPost[];
  withPhotos?: boolean;
  className?: string;
  endMarker?: string;
}) {
  if (posts.length === 0) return null;

  if (withPhotos) {
    return (
      <aside className={className}>
        <h2 className="text-3xl font-semibold text-brand-grey mt-2 md:mt-0">{title}</h2>
        <div className="mt-3 space-y-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/posts/${post.slug}`}
              className="block group"
            >
              {post.coverImage && (
                <Image
                  src={post.coverImageThumb || post.coverImage}
                  alt={post.title}
                  width={600}
                  height={400}
                  // Full width on mobile; on desktop this variant is the
                  // Recommended Climbs rail, which the detail layout pins to
                  // --featured-w: 280px. Same slot geometry as the feed card,
                  // so the same ladder applies.
                  sizes="(min-width: 768px) 280px, 100vw"
                  className="w-full aspect-[3/2] object-cover rounded-md"
                />
              )}
              <h3 className="text-xl font-semibold text-brand mt-1">
                {post.title}
              </h3>
              {post.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {post.description}
                </p>
              )}
            </Link>
          ))}
        </div>
        {endMarker && (
          <p className="md:hidden text-center text-muted-foreground py-6">
            — {endMarker} —
          </p>
        )}
      </aside>
    );
  }

  return (
    <aside className={className}>
      {/* Desktop right rail. Every caller of this variant already wraps it in
          `hidden md:block`, so a mobile branch here would sit inside a wrapper
          that hides it above md and be hidden by its own class below md —
          dead at every width. Mobile uses the withPhotos variant instead. */}
      <div className="hidden md:block pr-12">
        <h2 className="text-[35px] font-medium text-brand-grey">{title}</h2>
        <div className="mt-4 space-y-6">
          {posts.map((post) => (
            <div key={post.slug}>
              <Link
                href={`/posts/${post.slug}`}
                className="font-normal text-brand text-[27px] hover:underline"
              >
                {post.title}
              </Link>
              {post.description && (
                <p className="text-base text-muted-foreground line-clamp-2 mt-0.5">
                  {post.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
