"use client";

import { Film, Gamepad2, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/normalize";

const tabs: { mediaType: MediaType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { mediaType: "movie", label: "Movies", icon: Film },
  { mediaType: "tv", label: "TV", icon: Tv },
  { mediaType: "game", label: "Games", icon: Gamepad2 },
];

/** Movies / TV / Games switcher used by Wishlist and Hall of Fame. */
export function TypeTabs({
  active,
  onChange,
  counts,
}: {
  active: MediaType;
  onChange: (type: MediaType) => void;
  counts: Record<MediaType, number>;
}) {
  return (
    <div
      role="tablist"
      aria-label="Media type"
      className="flex w-full gap-1 rounded-full border border-border bg-surface p-1 sm:w-fit"
    >
      {tabs.map(({ mediaType, label, icon: Icon }) => {
        const selected = active === mediaType;
        return (
          <button
            key={mediaType}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(mediaType)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none",
              selected ? "bg-accent text-white" : "text-text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            <Icon className="hidden size-4 sm:block" />
            {label}
            <span
              className={cn(
                "min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums",
                selected ? "bg-white/20 text-white" : "bg-surface-2 text-text-muted",
              )}
            >
              {counts[mediaType]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
