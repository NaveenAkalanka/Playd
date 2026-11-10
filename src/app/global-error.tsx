"use client";

import "./globals.css";
import { ErrorFallback } from "@/components/error-fallback";

// Last-resort boundary for errors in the root layout itself.
export default function GlobalError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <ErrorFallback {...props} />
      </body>
    </html>
  );
}
