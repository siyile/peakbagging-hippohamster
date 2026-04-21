import { HeroBanner } from "@/components/hero-banner";
import { NavBar } from "@/components/nav-bar";
import { InfinitePostCardList } from "@/components/infinite-post-card-list";
import { SearchAnalytics } from "@/components/search-analytics";
import { searchPosts } from "@/lib/search";

const PAGE_SIZE = 10;

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  return {
    title: query ? `Search results for "${query}"` : "Search",
    robots: { index: false },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const initial = query
    ? await searchPosts({ q: query, offset: 0, limit: PAGE_SIZE })
    : { rows: [], hasMore: false };

  const heading = query
    ? `Search results for "${query}"`
    : "Search";

  const empty = query && initial.rows.length === 0;

  return (
    <div>
      <SearchAnalytics query={query} />
      <HeroBanner />
      <NavBar />

      {/* Desktop: centered single column, no right sidebar */}
      <div className="hidden md:block mt-4 max-w-[900px] mx-auto">
        {empty ? (
          <div className="pl-12">
            <h2 className="text-[50px] font-semibold text-brand-grey">
              {heading}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              No posts matched your search. Try different keywords.
            </p>
          </div>
        ) : (
          <InfinitePostCardList
            key={query}
            title={heading}
            initialPosts={initial.rows}
            query={query}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden px-4 space-y-3">
        {empty ? (
          <>
            <h2 className="text-3xl font-semibold text-brand-grey mt-2">
              {heading}
            </h2>
            <p className="text-muted-foreground">
              No posts matched your search. Try different keywords.
            </p>
          </>
        ) : (
          <InfinitePostCardList
            key={query}
            title={heading}
            initialPosts={initial.rows}
            query={query}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>
    </div>
  );
}
