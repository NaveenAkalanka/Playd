"use client";

import { HallOfFameGrid } from "@/components/hall-of-fame-grid";
import { useTypeTab } from "@/lib/use-type-tab";
import { TypeTabs } from "@/components/type-tabs";
import type { MediaType } from "@/lib/normalize";
import type { getFavorites } from "@/lib/actions/items";

type FavoriteItem = Awaited<ReturnType<typeof getFavorites>>[number];

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
      <div className="px-4 pt-3">
        <TypeTabs
          active={active}
          onChange={setActive}
          counts={{ movie: movies.length, tv: tv.length, game: games.length }}
        />
      </div>
      <HallOfFameGrid mediaType={active} items={itemsByType[active]} />
    </div>
  );
}
