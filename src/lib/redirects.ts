// Permanent (308) redirects from the old static-site URLs to the current
// routes, consumed by redirects() in next.config.ts so they resolve in the
// routing layer without invoking middleware. Keys are pathnames WITHOUT a
// trailing slash (Next's trailing-slash normalization runs first). Old posts
// used /posts/{region}/{peak_with_underscores}/; entry order matters because
// next.config.ts appends a catch-all for unmapped /posts/{region}/{peak}
// URLs after these, and first match wins. Destinations containing spaces are
// percent-encoded at the point of use.
export const LEGACY_REDIRECTS: Record<string, string> = {
  // Posts
  "/posts/north_cascades/north_gardner_mountain": "/posts/north-gardner-mountain",
  "/posts/mountain_loop_highway/white_chuck_mountain": "/posts/white-chuck-mountain",
  "/posts/south_cascades/ives_peak": "/posts/ives-peak-north-ridge",
  "/posts/alpine_lake_wilderness/mc_clellan_butte": "/posts/mcclellan-butte",
  "/posts/mount_rainier/boundary_peak": "/posts/boundary-peak",
  "/posts/alpine_lake_wilderness/cannon_mountain": "/posts/cannon-mountain-southwest-ridge",
  "/posts/south_cascades/gilbert_peak": "/posts/gilbert-peak-west-route",
  "/posts/alpine_lake_wilderness/chikamin_peak": "/posts/chikamin-peak",
  "/posts/mount_rainier/cowlitz_chimneys": "/posts/cowlitz-chimneys",
  "/posts/alpine_lake_wilderness/chair_peak": "/posts/chair-peak-ne-buttress",
  "/posts/alpine_lake_wilderness/mount_thompson": "/posts/mount-thompson",
  "/posts/alpine_lake_wilderness/huckleberry_mountain": "/posts/huckleberry-mountain",
  "/posts/alpine_lake_wilderness/snoqualmie_pass_north_traverse": "/posts/snoqualmie-pass-north-traverse",
  "/posts/index_area/gunn_peak": "/posts/gunn-peak",
  "/posts/north_cascades/tomyhoi_peak": "/posts/tomyhoi-peak",
  "/posts/north_cascades/black_peak": "/posts/black-peak",
  "/posts/north_cascades/big_craggy_west_craggy": "/posts/big-craggy-peak-and-west-craggy-peak",
  "/posts/alpine_lake_wilderness/kaleetan_peak": "/posts/kaleetan-peak",

  // Posts that gained a route name when they moved (ives_peak ->
  // ives-peak-north-ridge). The bare slug still gets crawled, so map it to
  // the renamed post instead of letting it 404.
  "/posts/ives-peak": "/posts/ives-peak-north-ridge",
  "/posts/cannon-mountain": "/posts/cannon-mountain-southwest-ridge",
  "/posts/gilbert-peak": "/posts/gilbert-peak-west-route",
  "/posts/chair-peak": "/posts/chair-peak-ne-buttress",
  "/posts/big-craggy-west-craggy": "/posts/big-craggy-peak-and-west-craggy-peak",

  // Legacy hyphenated tag URLs -> current tag pages (which use spaces).
  // Only tags that still exist are listed; anything else falls through to the
  // tag page's notFound().
  // Single-word tags (smoot, scramble, bulger, olympic, enchantments) get no
  // entry here. Redirecting /tags/smoot -> /tags/Smoot loops forever: route
  // matching is case-insensitive, so the source matches its own destination.
  // generateMetadata canonicalises the casing instead.
  "/tags/north-cascades": "/tags/North Cascades",
  "/tags/alpine-lake-wilderness": "/tags/Alpine Lakes Wilderness",
  "/tags/alpine-lakes-wilderness": "/tags/Alpine Lakes Wilderness",
  "/tags/mount-rainier-national-park": "/tags/Mount Rainier National Park",
  "/tags/rainier-100": "/tags/Rainier 100",
  "/tags/alpine-climb": "/tags/Alpine Climb",
  "/tags/glacier-climb": "/tags/Glacier Climb",
  "/tags/ski-touring": "/tags/Ski Touring",
  "/tags/cascade-volcanoes": "/tags/Cascade Volcanoes",
  "/tags/south-cascades": "/tags/South Cascades",
  "/tags/mountain-loop-highway": "/tags/Mountain Loop Highway",
  "/tags/index-area": "/tags/Index Area",
  "/tags/snoqualmie-20": "/tags/Snoqualmie 20",
  // Retired Hugo tag with no current equivalent; the Snoqualmie peak list is
  // the closest surviving grouping.
  "/tags/snoqualmie-region": "/tags/Snoqualmie 20",

  // Legacy browse/taxonomy pages -> nearest current equivalent. The paginated
  // and per-category shapes (/page/3, /categories/scramble/page/2) are matched
  // by pattern in next.config.ts rather than listed one page at a time here.
  "/archives": "/posts",
  "/zh": "/",

  // Hugo-era RSS feeds. The current site publishes no feed, so point the
  // English one at the full post index and the Chinese one where /zh goes.
  "/index.xml": "/posts",
  "/zh/index.xml": "/",
};
