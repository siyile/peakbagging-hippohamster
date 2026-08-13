import { SignJWT } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "admin_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

// Shared so destroySession clears the exact cookie createSession set — a
// mismatched path would leave the original cookie in place.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return false;

  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const hexDigest = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hexDigest === hash;
}

export async function createSession(): Promise<void> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE,
  });
}

// The token is self-contained with no server-side session store, so clearing
// the cookie is the only way to end a session short of rotating JWT_SECRET.
// Overwrite with maxAge 0 rather than delete() so the expiry is explicit.
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}
