"use server";

import { auth } from "@/lib/auth/server";

export async function resetPassword(
  _prevState: { error?: string; done?: boolean } | null,
  formData: FormData,
) {
  const token = formData.get("token") as string;
  const newPassword = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const { error } = await auth.resetPassword({ newPassword, token });

  if (error) {
    return { error: error.message || "Couldn't reset your password. The link may have expired." };
  }

  return { done: true };
}
