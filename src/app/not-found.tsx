import Link from "next/link";

// Branded 404 instead of the bare framework/host page, with a way back.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-2xl font-bold">
        <span className="text-accent">404</span> · Page not found
      </h1>
      <p className="max-w-sm text-text-muted">
        That page doesn&apos;t exist, or the link is out of date.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Go home
        </Link>
        <Link href="/movies" className="text-sm text-text-muted hover:text-foreground">
          Movies
        </Link>
        <Link href="/tv" className="text-sm text-text-muted hover:text-foreground">
          TV
        </Link>
        <Link href="/games" className="text-sm text-text-muted hover:text-foreground">
          Games
        </Link>
      </div>
    </div>
  );
}
