import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { resolveLegacyRedirect } from "@/lib/redirects";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  // Permanently redirect old static-site URLs to their current routes so the
  // pages Google already indexed keep their ranking signals.
  const legacyTarget = resolveLegacyRedirect(pathname);
  if (legacyTarget) {
    const url = request.nextUrl.clone();
    url.pathname = legacyTarget;
    url.search = "";
    return NextResponse.redirect(url, 308);
  }

  // Keep *.vercel.app (production alias + preview deploys) out of search
  // indexes so they don't compete with the canonical www.hippohamster.com.
  const isPreviewHost = host.endsWith(".vercel.app");
  const withNoindex = (response: NextResponse) => {
    if (isPreviewHost) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  };

  // Protect all /admin/* routes (the login page itself is exempt).
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get("admin_token")?.value;

    if (!token) {
      return withNoindex(
        NextResponse.redirect(new URL("/admin/login", request.url))
      );
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch {
      return withNoindex(
        NextResponse.redirect(new URL("/admin/login", request.url))
      );
    }
  }

  return withNoindex(NextResponse.next());
}

export const config = {
  // Run on all routes except Next internals and static assets, so the noindex
  // header is applied to public pages (not just /admin).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
