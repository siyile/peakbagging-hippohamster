"use server";

import { verifyPassword, createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function login(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const password = formData.get("password") as string;

  if (!password) {
    return "Password is required";
  }

  const valid = await verifyPassword(password);

  if (!valid) {
    return "Invalid password";
  }

  await createSession();
  redirect("/admin/posts");
}
