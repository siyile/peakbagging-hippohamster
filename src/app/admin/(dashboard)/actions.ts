"use server";

import { destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

// The header "Logout" used to be a plain link to /admin/login, which left the
// 7-day session cookie valid — navigating back to /admin/posts logged you
// straight back in. This actually clears it.
export async function logout() {
  await destroySession();
  redirect("/admin/login");
}
