import Link from "next/link";

interface PostLink {
  title: string;
  slug: string;
  description: string | null;
  coverImage?: string | null;
  coverImageThumb?: string | null;
}

export function PostLinkList({
  title,
  posts,
  readMoreHref,
  moreHref,
  moreLabel,
}: {
  title: string;
  posts: PostLink[];
  readMoreHref?: string;
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <>
      {/* Desktop */}
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
          {readMoreHref && (
            <Link
              href={readMoreHref}
              className="text-brand font-medium hover:underline inline-block"
            >
              Read More &gt;
            </Link>
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <h2 className="text-3xl font-semibold text-brand-grey mt-2">{title}</h2>
        <div className="mt-3 space-y-4">
          {posts.map((post) => (
            <Link key={post.slug} href={`/posts/${post.slug}`} className="block group">
              {post.coverImage && (
                <img
                  src={post.coverImageThumb || post.coverImage}
                  alt={post.title}
                  className="w-full aspect-[2/1] object-cover rounded-md"
                />
              )}
              <h3 className="text-xl font-semibold text-brand mt-1">{post.title}</h3>
              {post.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {post.description}
                </p>
              )}
            </Link>
          ))}
        </div>
        {moreHref && (
          <Link
            href={moreHref}
            className="mt-4 mb-4 inline-block text-brand font-medium underline"
          >
            {moreLabel || "Read More"} &gt;
          </Link>
        )}
      </div>
    </>
  );
}
