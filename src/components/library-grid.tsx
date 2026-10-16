"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PosterCard } from "@/components/poster-card";
import { TitleListRow } from "@/components/title-list-row";
import { ViewToggle } from "@/components/view-toggle";
import { FilterSortBar, type SortMode } from "@/components/filter-sort-bar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { removeItem, setFavorite } from "@/lib/actions/items";
import { moveToWishlist } from "@/lib/actions/wishlist";
import { useViewMode } from "@/lib/use-view-mode";
import { useProgressiveReveal } from "@/lib/use-progressive-reveal";
import { applyFilterSort, deriveGenreOptions, deriveLanguageOptions } from "@/lib/filter-sort";
import { externalInfoUrl } from "@/lib/external-links";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/normalize";

interface LibraryItem {
  id: number;
  sourceId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[] | null;
  originalLanguage: string | null;
  isFavorite: boolean;
}

// Column counts per size, tuned so "sm" fits noticeably more per row than
// "lg" at every breakpoint rather than just scaling uniformly.
const gridColsClass: Record<"sm" | "md" | "lg", string> = {
  sm: "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8",
  md: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
  lg: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
};

export function LibraryGrid({
  mediaType,
  items,
}: {
  mediaType: MediaType;
  items: LibraryItem[];
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useViewMode();
  const [sortMode, setSortMode] = useState<SortMode>("added");
  const [genreFilter, setGenreFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");

  const genreOptions = useMemo(() => deriveGenreOptions(items), [items]);
  const languageOptions = useMemo(() => deriveLanguageOptions(items), [items]);
  const visibleItems = useMemo(
    () => applyFilterSort(items, { genreFilter, yearFilter, languageFilter, sortMode }),
    [items, genreFilter, yearFilter, languageFilter, sortMode],
  );
  const { visibleItems: revealed, hasMore, sentinelRef } = useProgressiveReveal(visibleItems);

  async function handleRemove(id: number) {
    await removeItem(mediaType, id);
    router.refresh();
  }

  async function handleMoveToWishlist(id: number) {
    await moveToWishlist(mediaType, id);
    router.refresh();
  }

  async function handleToggleFavorite(item: LibraryItem) {
    await setFavorite(mediaType, item.id, !item.isFavorite);
    router.refresh();
  }

  function handleViewMoreInfo(item: LibraryItem) {
    window.open(
      externalInfoUrl(mediaType, item.sourceId, item.title),
      "_blank",
      "noopener,noreferrer",
    );
  }

  function menuItemsFor(item: LibraryItem) {
    return (
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => handleToggleFavorite(item)}>
          {item.isFavorite ? "Remove from Hall of Fame" : "Add to Hall of Fame"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => handleMoveToWishlist(item.id)}>
          Move to wishlist
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => handleViewMoreInfo(item)}>
          View more info
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={() => handleRemove(item.id)}>
          Remove
        </ContextMenuItem>
      </ContextMenuContent>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <FilterSortBar
          sortMode={sortMode}
          onSortChange={setSortMode}
          genreOptions={genreOptions}
          genreFilter={genreFilter}
          onGenreChange={setGenreFilter}
          yearFilter={yearFilter}
          onYearChange={setYearFilter}
          languageOptions={languageOptions}
          languageFilter={languageFilter}
          onLanguageChange={setLanguageFilter}
        />
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {items.length === 0 ? (
        <p className="py-24 text-center text-text-muted">
          Nothing here yet. Use Discover to add titles.
        </p>
      ) : visibleItems.length === 0 ? (
        <p className="py-24 text-center text-text-muted">No titles match these filters.</p>
      ) : (
        <>
          {viewMode === "list" ? (
            <div className="flex flex-col divide-y divide-border">
              {revealed.map((item) => (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>
                    <div>
                      <TitleListRow title={item.title} year={item.year} posterUrl={item.posterUrl} />
                    </div>
                  </ContextMenuTrigger>
                  {menuItemsFor(item)}
                </ContextMenu>
              ))}
            </div>
          ) : (
            <div className={cn("grid gap-3", gridColsClass[viewMode])}>
              {revealed.map((item) => (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>
                    <div>
                      <PosterCard title={item.title} year={item.year} posterUrl={item.posterUrl} />
                    </div>
                  </ContextMenuTrigger>
                  {menuItemsFor(item)}
                </ContextMenu>
              ))}
            </div>
          )}
          {hasMore && <div ref={sentinelRef} className="h-1" />}
        </>
      )}
    </div>
  );
}
