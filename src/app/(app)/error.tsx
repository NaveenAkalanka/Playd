"use client";

import { ErrorFallback } from "@/components/error-fallback";

// Catches errors in any (app) page while keeping the nav/footer around it,
// so a failed load is recoverable instead of a dead screen.
export default function AppError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorFallback {...props} />;
}
