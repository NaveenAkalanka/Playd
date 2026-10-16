"use client";

import { WishlistGrid } from "@/components/wishlist-grid";
import { useTypeTab } from "@/lib/use-type-tab";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/normalize";
import type { getWishlist } from "@/lib/actions/wishlist";

type WishlistItem = Awaited<ReturnType<typeof getWishlist>>[number];

const tabs: { mediaType: MediaType; label: string }[] = [
  { mediaType: "movie", label: "Movies" },
  { mediaType: "tv", label: "TV" },
  { mediaType: "game", label: "Games" },
];

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
      <WishlistGrid items={itemsByType[active]} />
    </div>
  );
}
