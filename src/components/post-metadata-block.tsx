import type { Post } from "@/db/schema";
import {
  timeCategoryLabel,
  rockRatingLabel,
  snowRatingLabel,
} from "@/lib/post-metadata";

type Metadata = Pick<
  Post,
  | "elevationFt"
  | "elevationGainFt"
  | "distanceMiles"
  | "timeCategory"
  | "rockRating"
  | "glacierRating"
  | "snowRating"
>;

export function PostMetadataBlock({ post }: { post: Metadata }) {
  const rows: Array<[string, string]> = [];

  if (post.elevationFt != null) {
    rows.push(["Elevation", `${post.elevationFt.toLocaleString()} ft`]);
  }
  const timeLabel = timeCategoryLabel(post.timeCategory);
  if (timeLabel) {
    rows.push(["Time", timeLabel]);
  }
  const rockLabel = rockRatingLabel(post.rockRating);
  if (rockLabel) {
    rows.push(["Rock Rating", rockLabel]);
  }
  if (post.glacierRating) {
    rows.push(["Glacier Rating", post.glacierRating]);
  }
  const snowLabel = snowRatingLabel(post.snowRating);
  if (snowLabel) {
    rows.push(["Snow Rating", snowLabel]);
  }
  if (post.distanceMiles != null) {
    const miles = Number(post.distanceMiles);
    rows.push(["Distance", `${miles} miles`]);
  }
  if (post.elevationGainFt != null) {
    rows.push(["Elevation Gain", `${post.elevationGainFt.toLocaleString()} ft`]);
  }

  if (rows.length === 0) return null;

  return (
    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-300 text-sm md:text-base">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span className="font-bold">{label}:</span> {value}
          </div>
        ))}
      </div>
    </div>
  );
}
