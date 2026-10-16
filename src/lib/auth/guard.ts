import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { enforceRateLimit } from "@/lib/rate-limit";

// Every protected page and server action calls one of the two guards
// below, so hooking the rate limit in here gives the whole app the same
// blanket coverage middleware would — generous enough to never trip during
// real use (e.g. rapid-clicking through the Discover popup), but it stops
// a runaway script or a compromised session from hammering the app.
const GENERAL_LIMIT = 300;

/** Use in Server Components / layouts: redirects instead of returning an error. */
export async function requireAllowedUserOrRedirect() {
  await enforceRateLimit("app", GENERAL_LIMIT);
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }
  if (session.user.email !== process.env.ALLOWED_EMAIL) {
    redirect("/forbidden");
  }

  return session.user;
}

/**
 * Use in Server Actions / Route Handlers: redirects to sign-in on a missing
 * session (expired/logged out — recoverable, e.g. the popup's auto-reopen
 * firing on a stale tab) but throws on a wrong-account session (an actual
 * unauthorized access attempt).
 */
export async function requireAllowedUserOrThrow() {
  await enforceRateLimit("app", GENERAL_LIMIT);
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }
  if (session.user.email !== process.env.ALLOWED_EMAIL) {
    throw new Error("Forbidden");
  }

  return session.user;
}
