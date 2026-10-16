"use client";

import { HallOfFameGrid } from "@/components/hall-of-fame-grid";
import { useTypeTab } from "@/lib/use-type-tab";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/normalize";
import type { getFavorites } from "@/lib/actions/items";

type FavoriteItem = Awaited<ReturnType<typeof getFavorites>>[number];

const tabs: { mediaType: MediaType; label: string }[] = [
  { mediaType: "movie", label: "Movies" },
  { mediaType: "tv", label: "TV" },
  { mediaType: "game", label: "Games" },
];

export function HallOfFamePageClient({
  movies,
  tv,
  games,
}: {
  movies: FavoriteItem[];
  tv: FavoriteItem[];
  games: FavoriteItem[];
}) {
  const [active, setActive] = useTypeTab();
  const itemsByType: Record<MediaType, FavoriteItem[]> = { movie: movies, tv, game: games };

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-2xl font-bold">Hall of Fame</h1>
      </div>
      <div className="flex gap-2 px-4 pt-3">
        {tabs.map((tab) => (
          <button
            key={tab.mediaType}
            type="button"
            onClick={() => setActive(tab.mediaType)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active === tab.mediaType
                ? "bg-accent text-white"
                : "bg-surface-2 text-text-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <HallOfFameGrid mediaType={active} items={itemsByType[active]} />
    </div>
  );
}
