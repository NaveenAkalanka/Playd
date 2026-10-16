"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Tv, Gamepad2, Bookmark, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/tv", label: "TV", icon: Tv },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/wishlist", label: "Wishlist", icon: Bookmark },
  { href: "/hall-of-fame", label: "Hall of Fame", icon: Trophy },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-6 border-t border-border bg-surface md:hidden">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-text-muted transition-colors",
              isActive && "text-accent",
            )}
          >
            <Icon className="size-5" />
            <span className="text-center text-[10px] leading-tight font-medium">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
