"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";

export async function requestPasswordReset(
  _prevState: { error?: string; sent?: boolean } | null,
  formData: FormData,
) {
  const email = formData.get("email") as string;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  const origin = host ? `${proto}://${host}` : undefined;

  const { error } = await auth.requestPasswordReset({
    email,
    redirectTo: origin ? `${origin}/auth/reset-password` : "/auth/reset-password",
  });

  if (error) {
    return { error: error.message || "Couldn't send a reset link. Try again." };
  }

  return { sent: true };
}
