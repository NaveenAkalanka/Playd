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
import { markWishlistItemWatched, removeFromWishlist } from "@/lib/actions/wishlist";
import { useViewMode } from "@/lib/use-view-mode";
import { useProgressiveReveal } from "@/lib/use-progressive-reveal";
import { useUndoToast } from "@/components/undo-toast-provider";
import { applyFilterSort, deriveGenreOptions, deriveLanguageOptions } from "@/lib/filter-sort";
import { externalInfoUrl } from "@/lib/external-links";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/lib/normalize";

interface WishlistItem {
  id: number;
  mediaType: MediaType;
  sourceId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[] | null;
  originalLanguage: string | null;
}

const gridColsClass: Record<"sm" | "md" | "lg", string> = {
  sm: "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8",
  md: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
  lg: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
};

export function WishlistGrid({ items }: { items: WishlistItem[] }) {
  const router = useRouter();
  const { showUndoToast } = useUndoToast();
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

  async function handleMarkWatched(item: WishlistItem) {
    await markWishlistItemWatched(item.mediaType, item.id, item.sourceId);
    router.refresh();
  }

  async function handleRemove(item: WishlistItem) {
    await removeFromWishlist(item.mediaType, item.id);
    router.refresh();
  }

  async function handleCopyTitle(item: WishlistItem) {
    try {
      await navigator.clipboard.writeText(item.title);
      showUndoToast({ title: item.title, action: "Copied" });
    } catch {
      // Clipboard access denied/unavailable — nothing sensible to do.
    }
  }

  function handleViewMoreInfo(item: WishlistItem) {
    window.open(
      externalInfoUrl(item.mediaType, item.sourceId, item.title),
      "_blank",
      "noopener,noreferrer",
    );
  }

  function menuItemsFor(item: WishlistItem) {
    return (
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => handleMarkWatched(item)}>
          Mark as watched
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => handleViewMoreInfo(item)}>
          View more info
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={() => handleRemove(item)}>
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
          Nothing in your wishlist yet.
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
                      <TitleListRow
                        title={item.title}
                        year={item.year}
                        posterUrl={item.posterUrl}
                        onClick={() => handleCopyTitle(item)}
                      />
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
                      <PosterCard
                        title={item.title}
                        year={item.year}
                        posterUrl={item.posterUrl}
                        onClick={() => handleCopyTitle(item)}
                      />
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
