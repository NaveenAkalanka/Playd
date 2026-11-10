"use client";

import { WishlistGrid } from "@/components/wishlist-grid";
import { useTypeTab } from "@/lib/use-type-tab";
import { TypeTabs } from "@/components/type-tabs";
import type { MediaType } from "@/lib/normalize";
import type { getWishlist } from "@/lib/actions/wishlist";

type WishlistItem = Awaited<ReturnType<typeof getWishlist>>[number];

export function WishlistPageClient({
  movies,
  tv,
  games,
}: {
  movies: WishlistItem[];
  tv: WishlistItem[];
  games: WishlistItem[];
}) {
  const [active, setActive] = useTypeTab();
  const itemsByType: Record<MediaType, WishlistItem[]> = { movie: movies, tv, game: games };

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-2xl font-bold">Wishlist</h1>
      </div>
      <div className="px-4 pt-3">
        <TypeTabs
          active={active}
          onChange={setActive}
          counts={{ movie: movies.length, tv: tv.length, game: games.length }}
        />
      </div>
      <WishlistGrid items={itemsByType[active]} />
    </div>
  );
}
