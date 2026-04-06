import Link from "next/link";
import Image from "next/image";

interface PostCard {
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  coverImageThumb: string | null;
  tripDate?: Date | null;
}

export function PostCardList({
  title,
  posts,
  moreHref,
  moreLabel,
}: {
  title: string;
  posts: PostCard[];
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block pl-12">
        <h2 className="text-[50px] font-semibold text-brand-grey">{title}</h2>
        <div className="mt-4 space-y-6">
          {posts.map((fp) => (
            <Link
              key={fp.slug}
              href={`/posts/${fp.slug}`}
              className="flex items-start gap-6 group"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-brand text-[27px]">
                  {fp.title}
                </h3>
                {fp.description && (
                  <p className="text-[20px] text-muted-foreground line-clamp-2 mt-0.5">
                    {fp.description}
                  </p>
                )}
                {fp.tripDate && (
                  <p className="text-[16px] text-muted-foreground mt-1">
                    {new Date(fp.tripDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    by Siyi
                  </p>
                )}
              </div>
              {fp.coverImage && (
                <Image
                  src={fp.coverImageThumb || fp.coverImage}
                  alt={fp.title}
                  width={280}
                  height={160}
                  className="w-[280px] h-[160px] object-cover rounded-md shrink-0"
                />
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <h2 className="text-3xl font-semibold text-brand-grey mt-2">{title}</h2>
        <div className="mt-3 space-y-4">
          {posts.map((fp) => (
            <Link key={fp.slug} href={`/posts/${fp.slug}`} className="block group">
              {fp.coverImage && (
                <Image
                  src={fp.coverImageThumb || fp.coverImage}
                  alt={fp.title}
                  width={600}
                  height={300}
                  className="w-full aspect-[2/1] object-cover rounded-md"
                />
              )}
              <h3 className="text-xl font-semibold text-brand mt-1">{fp.title}</h3>
              {fp.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {fp.description}
                </p>
              )}
            </Link>
          ))}
        </div>
        {moreHref && (
          <Link
            href={moreHref}
            className="mt-4 inline-block text-brand font-medium underline"
          >
            {moreLabel || "Read More"} &gt;
          </Link>
        )}
      </div>
    </>
  );
}
