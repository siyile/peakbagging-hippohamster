// Permanent (308) redirects from the old static-site URLs to the current routes.
// Keys are pathnames WITHOUT a trailing slash; the lookup normalizes incoming
// paths before matching. Old posts used /posts/{region}/{peak_with_underscores}/.
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

  // Legacy hyphenated tag URLs -> current tag pages (which use spaces).
  // Only tags that still exist are redirected; orphans fall through to a
  // real 404 via the tag page's notFound().
  "/tags/north-cascades": "/tags/North Cascades",
  "/tags/alpine-lake-wilderness": "/tags/Alpine Lakes Wilderness",
  "/tags/mount-rainier-national-park": "/tags/Mount Rainier National Park",
  "/tags/rainier-100": "/tags/Rainier 100",

  // Legacy browse/taxonomy pages -> nearest current equivalent
  "/archives": "/posts",
  "/categories/climb": "/posts",
  "/categories/scramble": "/posts",
  "/categories/scramble/page/4": "/posts",
  "/page/2": "/posts",
  "/page/4": "/posts",
  "/page/5": "/posts",
  "/page/6": "/posts",
  "/zh": "/",
};

// Resolve a legacy redirect target for a request pathname, or null if none.
// Handles trailing slashes and any unmapped legacy /posts/{region}/{peak}/ URL
// by falling back to the posts index so no old post URL hard-404s.
export function resolveLegacyRedirect(pathname: string): string | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  const mapped = LEGACY_REDIRECTS[normalized];
  if (mapped) return mapped;

  // Old post URLs always had exactly two path segments under /posts.
  // Current posts live at /posts/{slug} (one segment), so a two-segment
  // /posts/x/y path is always legacy — send stragglers to the index.
  if (/^\/posts\/[^/]+\/[^/]+$/.test(normalized)) {
    return "/posts";
  }

  return null;
}
