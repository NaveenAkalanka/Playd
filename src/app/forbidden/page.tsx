import { SignOutButton } from "@/components/sign-out-button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-2xl font-bold">403 — Not allowed</h1>
      <p className="max-w-sm text-text-muted">
        This account is not permitted to use Playd. Sign out and sign in with
        the right account.
      </p>
      <SignOutButton className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">
        Sign out
      </SignOutButton>
    </div>
  );
}
