"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { isStaleDeployError, reloadOnceForStaleDeploy } from "@/lib/stale-deploy";

/** Shared body for error.tsx / global-error.tsx. */
export function ErrorFallback({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const stale = isStaleDeployError(error);

  useEffect(() => {
    console.error(error);
    if (stale) reloadOnceForStaleDeploy();
  }, [error, stale]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">
        {stale ? "Playd was updated" : "Something went wrong"}
      </h1>
      <p className="max-w-sm text-text-muted">
        {stale
          ? "A newer version was deployed while this tab was open. Reloading to pick it up…"
          : "This page didn't load properly. It's usually a temporary network or deploy hiccup, so trying again normally fixes it."}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          <RotateCw className="size-4" />
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-surface-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-border"
        >
          Reload page
        </button>
        <Link href="/" className="text-sm text-text-muted hover:text-foreground">
          Home
        </Link>
      </div>
    </div>
  );
}
