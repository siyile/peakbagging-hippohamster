import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Use inside admin server actions for defense-in-depth. Middleware also
// gates /admin/* page POSTs, but Next.js routes a server action POST to the
// page that imported it — so any action imported into a non-admin page would
// bypass middleware. This check makes that impossible.
export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) throw new Error("Unauthorized");
  try {
    await jwtVerify(token, JWT_SECRET);
  } catch {
    throw new Error("Unauthorized");
  }
}
