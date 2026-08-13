import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Only job left here: gate /admin/* behind the admin JWT. Legacy redirects
// and the *.vercel.app noindex header live in next.config.ts, where Vercel
// resolves them in the routing layer — the proxy runs before the CDN cache
// and bills Active CPU on every matched request, so keep its surface minimal.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The matcher below should only send gated admin paths here; re-check so a
  // matcher regression fails closed rather than silently skipping auth.
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
  } catch {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Bare /admin (it redirects to /admin/posts) plus everything under /admin/
  // except exactly /admin/login. The lookahead is end-anchored so paths like
  // /admin/logins or /admin/login/extra stay gated.
  matcher: ["/admin", "/admin/((?!login$).*)"],
};
