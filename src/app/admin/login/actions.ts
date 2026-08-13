"use server";

import { headers } from "next/headers";
import { verifyPassword, createSession } from "@/lib/auth";
import {
  checkRateLimit,
  recordFailure,
  resetRateLimit,
} from "@/lib/rate-limit";
import { redirect } from "next/navigation";

export async function login(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const password = formData.get("password") as string;

  if (!password) {
    return "Password is required";
  }

  // One shared password, no username, no lockout, and the source is public —
  // throttle per IP so it can't be guessed at network speed.
  const forwarded = (await headers()).get("x-forwarded-for");
  const key = `login:${forwarded?.split(",")[0]?.trim() || "unknown"}`;

  const { allowed, retryAfterSec } = checkRateLimit(key);
  if (!allowed) {
    const minutes = Math.ceil(retryAfterSec / 60);
    return `Too many attempts. Try again in ${minutes} minute${
      minutes === 1 ? "" : "s"
    }.`;
  }

  const valid = await verifyPassword(password);

  if (!valid) {
    recordFailure(key);
    return "Invalid password";
  }

  resetRateLimit(key);
  await createSession();
  redirect("/admin/posts");
}
