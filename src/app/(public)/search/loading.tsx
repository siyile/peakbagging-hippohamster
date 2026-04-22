import { Shimmer } from "@/components/skeleton";

function CardSkeleton() {
  return (
    <div className="flex items-start gap-6">
      <div className="flex-1 min-w-0">
        <Shimmer className="h-7 w-3/4" />
        <Shimmer className="h-5 w-full mt-2" />
        <Shimmer className="h-5 w-2/3 mt-1" />
        <Shimmer className="h-4 w-24 mt-2" />
      </div>
      <Shimmer className="w-[280px] aspect-[3/2] shrink-0" />
    </div>
  );
}

function MobileCardSkeleton() {
  return (
    <div>
      <Shimmer className="w-full aspect-[3/2]" />
      <Shimmer className="h-6 w-3/4 mt-2" />
      <Shimmer className="h-4 w-full mt-1" />
    </div>
  );
}

export default function Loading() {
  return (
    <div>
      {/* Hero banner placeholder - desktop */}
      <div className="hidden md:block relative -mt-8 left-1/2 -translate-x-1/2 w-screen overflow-hidden">
        <Shimmer className="w-full h-[450px] rounded-none" />
      </div>

      {/* Nav placeholder - desktop */}
      <div className="hidden md:flex items-center justify-center gap-8 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-5 w-20" />
        ))}
      </div>

      {/* Desktop: centered single column, no right sidebar */}
      <div className="hidden md:block mt-4 max-w-[900px] mx-auto">
        <div className="pl-12">
          <Shimmer className="h-12 w-80" />
          <div className="mt-4 space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-4 space-y-3">
        <Shimmer className="h-8 w-64 mt-2" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <MobileCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
