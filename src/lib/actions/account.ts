"use server";

import { auth } from "@/lib/auth/server";
import { requireAllowedUserOrThrow } from "@/lib/auth/guard";

export async function updateName(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  await requireAllowedUserOrThrow();
  const name = (formData.get("name") as string)?.trim();

  if (!name) {
    return { error: "Name can't be empty." };
  }

  const { error } = await auth.updateUser({ name });
  if (error) {
    return { error: error.message || "Couldn't update your name. Try again." };
  }

  return { success: true };
}

export async function updatePassword(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  await requireAllowedUserOrThrow();
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (newPassword !== confirmPassword) {
    return { error: "New passwords don't match." };
  }

  const { error } = await auth.changePassword({
    currentPassword,
    newPassword,
    revokeOtherSessions: true,
  });
  if (error) {
    return { error: error.message || "Couldn't change your password. Check your current password." };
  }

  return { success: true };
}
