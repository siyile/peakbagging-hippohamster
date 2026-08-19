import Link from "next/link";

interface PostLink {
  title: string;
  slug: string;
  description: string | null;
}

export function PostLinkList({
  title,
  posts,
  readMoreHref,
}: {
  title: string;
  posts: PostLink[];
  readMoreHref?: string;
}) {
  return (
    // Desktop right rail. The one caller already wraps this in `hidden
    // md:block`, so a mobile branch here would be hidden above md by that
    // wrapper and below md by its own class — dead at every width.
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
  );
}
