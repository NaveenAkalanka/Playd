"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "TV" },
  { href: "/games", label: "Games" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
] as const;

// Searching from inside a media tab locks search to that type, so it
// matches the context you're already browsing.
const searchTypeByPath: Record<string, string> = {
  "/movies": "movie",
  "/tv": "tv",
  "/games": "game",
};

export function TopNav() {
  const pathname = usePathname();
  const searchType = Object.entries(searchTypeByPath).find(([path]) =>
    pathname.startsWith(path),
  )?.[1];
  const searchHref = searchType ? `/search?type=${searchType}` : "/search";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center" aria-label="Playd">
          <Image
            src="/logo.svg"
            alt="Playd"
            width={1420}
            height={550}
            priority
            className="h-7 w-auto"
          />
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium text-text-muted transition-colors hover:text-foreground",
                  isActive && "text-accent hover:text-accent",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href={searchHref}
          aria-label="Search"
          className="text-text-muted transition-colors hover:text-foreground"
        >
          <Search className="size-5" />
        </Link>
        <SignOutButton className="text-text-muted transition-colors hover:text-foreground" />
      </div>
    </header>
  );
}
