"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export function Footer() {
  // Attribution stays on every page except the Home dashboard.
  if (usePathname() === "/") return null;

  return (
    <footer className="border-t border-border bg-surface px-4 py-6 text-center md:px-6">
      <div className="mx-auto flex flex-col items-center justify-center gap-2 text-xs text-text-muted sm:flex-row sm:gap-3">
        <span>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </span>
        <Image
          src="/tmdb-logo.svg"
          alt="The Movie Database (TMDB) logo"
          width={96}
          height={7}
          className="h-[14px] w-auto opacity-90"
        />
      </div>
    </footer>
  );
}
