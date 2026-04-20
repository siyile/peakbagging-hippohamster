import { Shimmer } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_var(--featured-w,280px)] gap-0 md:gap-8">
      <article>
        {/* Cover image */}
        <Shimmer className="w-full max-h-[480px] h-[300px] md:h-[480px] rounded-none md:rounded-xl" />

        {/* Header */}
        <div className="border-b px-4 pt-2 pb-2 md:px-6 md:pt-6 md:pb-6">
          <div className="mb-1 md:mb-3 flex gap-2">
            <Shimmer className="h-8 w-28 rounded-[4px]" />
            <Shimmer className="h-8 w-24 rounded-[4px]" />
          </div>
          <Shimmer className="h-9 w-3/4" />
          <Shimmer className="h-5 w-full mt-2" />
          <Shimmer className="h-4 w-48 mt-3" />
        </div>

        {/* Content */}
        <div className="px-4 pt-4 md:px-6 md:pt-6 space-y-4">
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-5/6" />
          <Shimmer className="w-full aspect-[2/1] mt-4" />
          <Shimmer className="h-4 w-full mt-4" />
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-3/4" />
          <Shimmer className="w-full aspect-[2/1] mt-4" />
          <Shimmer className="h-4 w-full mt-4" />
          <Shimmer className="h-4 w-2/3" />
        </div>
      </article>

      {/* Featured climbs sidebar */}
      <aside className="hidden md:block pt-6">
        <Shimmer className="h-8 w-48" />
        <div className="mt-4 space-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Shimmer className="h-5 w-3/4" />
              <Shimmer className="h-4 w-full mt-1" />
              <Shimmer className="w-full aspect-[3/2] mt-2" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
