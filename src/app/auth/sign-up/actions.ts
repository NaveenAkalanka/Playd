"use server";

import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { isAllowedEmail } from "@/lib/auth/guard";

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();

  if (!isAllowedEmail(email)) {
    return { error: "This app is private. Sign-up is restricted." };
  }

  const { error } = await auth.signUp.email({
    email,
    name: formData.get("name") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message || "Failed to create account." };
  }

  redirect("/");
}
