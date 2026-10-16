"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    null,
  );

  return (
    <form
      action={formAction}
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-4"
    >
      <Image src="/icon-mark.svg" alt="" width={547} height={550} className="h-12 w-auto" />
      <h1 className="text-center text-2xl font-bold">Reset your password</h1>
      <p className="max-w-sm text-center text-sm text-text-muted">
        Enter your account email and we&apos;ll send you a link to set a new password.
      </p>

      {state?.sent ? (
        <div className="w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2.5 text-center text-sm">
          If that email has an account, a reset link is on its way. Check your inbox.
        </div>
      ) : (
        <>
          <div className="flex w-full max-w-sm flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-text-muted">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {state?.error && (
            <div className="w-full max-w-sm rounded-md px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full max-w-sm rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send reset link"}
          </button>
        </>
      )}

      <Link
        href="/auth/sign-in"
        className="text-sm text-text-muted hover:text-foreground"
      >
        Back to sign in
      </Link>
    </form>
  );
}
