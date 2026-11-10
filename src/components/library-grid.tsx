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
import { removeItem, restoreItem, setFavorite } from "@/lib/actions/items";
import { useOptimisticItems } from "@/lib/use-optimistic-items";
import { moveToWishlist } from "@/lib/actions/wishlist";
import { useViewMode } from "@/lib/use-view-mode";
import { useUndoToast } from "@/components/undo-toast-provider";
import { useProgressiveReveal } from "@/lib/use-progressive-reveal";
import { applyFilterSort, deriveGenreOptions, deriveLanguageOptions, deriveYearOptions } from "@/lib/filter-sort";
import { externalInfoUrl } from "@/lib/external-links";
import { EmptyState, emptyActionClass } from "@/components/empty-state";
import { Compass, Film, Gamepad2, SearchX, Tv } from "lucide-react";
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

const emptyIcon: Record<MediaType, React.ComponentType<{ className?: string }>> = {
  movie: Film,
  tv: Tv,
  game: Gamepad2,
};
const noun: Record<MediaType, string> = { movie: "movies", tv: "series", game: "games" };

export function LibraryGrid({
  mediaType,
  items: serverItems,
  onDiscover,
}: {
  mediaType: MediaType;
  items: LibraryItem[];
  /** Opens the discovery popup; offered as the empty-state action. */
  onDiscover?: () => void;
}) {
  const router = useRouter();
  const { showUndoToast } = useUndoToast();
  const { items, hide, unhide, patch, unpatch } = useOptimisticItems(serverItems);
  const [viewMode, setViewMode] = useViewMode();
  const [sortMode, setSortMode] = useState<SortMode>("added");
  const [genreFilter, setGenreFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const genreOptions = useMemo(() => deriveGenreOptions(items), [items]);
  const languageOptions = useMemo(() => deriveLanguageOptions(items), [items]);
  const yearOptions = useMemo(() => deriveYearOptions(items), [items]);
  const visibleItems = useMemo(
    () =>
      applyFilterSort(items, {
        genreFilter,
        yearFilter,
        languageFilter,
        sortMode,
        query: searchQuery,
      }),
    [items, genreFilter, yearFilter, languageFilter, sortMode, searchQuery],
  );
  const { visibleItems: revealed, hasMore, sentinelRef } = useProgressiveReveal(
    visibleItems,
    `${sortMode}|${genreFilter}|${yearFilter}|${languageFilter}|${searchQuery}`,
  );

  // Menu actions update the grid immediately (optimistic), then sync with
  // the server. On failure the change is rolled back and a toast says so,
  // instead of leaving an uncaught server-action error in the console.
  function failed(label: string, title: string, error: unknown) {
    console.error(`[${label}] failed`, error);
    showUndoToast({ title, action: "Couldn't update" });
  }

  async function handleRemove(item: LibraryItem) {
    hide(item.id);
    try {
      const removed = await removeItem(mediaType, item.id);
      router.refresh();
      if (removed) {
        showUndoToast({
          title: item.title,
          action: "Removed",
          onUndo: async () => {
            // Re-inserts with the original added date and Hall of Fame flag.
            await restoreItem(mediaType, removed);
            router.refresh();
          },
        });
      }
    } catch (error) {
      unhide(item.id);
      failed("remove", item.title, error);
    }
  }

  async function handleMoveToWishlist(item: LibraryItem) {
    hide(item.id);
    try {
      await moveToWishlist(mediaType, item.id);
      router.refresh();
      showUndoToast({ title: item.title, action: "Wishlisted" });
    } catch (error) {
      unhide(item.id);
      failed("move to wishlist", item.title, error);
    }
  }

  async function handleToggleFavorite(item: LibraryItem) {
    const next = !item.isFavorite;
    patch(item.id, { isFavorite: next });
    try {
      await setFavorite(mediaType, item.id, next);
      router.refresh();
    } catch (error) {
      unpatch(item.id);
      failed("favorite", item.title, error);
    }
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
        <ContextMenuItem onSelect={() => handleMoveToWishlist(item)}>
          Move to wishlist
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
        {items.length > 0 && (
        <FilterSortBar
          sortMode={sortMode}
          onSortChange={setSortMode}
          genreOptions={genreOptions}
          genreFilter={genreFilter}
          onGenreChange={setGenreFilter}
          yearFilter={yearFilter}
          onYearChange={setYearFilter}
          yearOptions={yearOptions}
          languageOptions={languageOptions}
          languageFilter={languageFilter}
          onLanguageChange={setLanguageFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={mediaType === "game" ? "Search played games" : "Search watched titles"}
          trailing={<ViewToggle mode={viewMode} onChange={setViewMode} />}
        />
        )}

      {items.length === 0 ? (
        <EmptyState
          icon={emptyIcon[mediaType]}
          title={`No ${noun[mediaType]} logged yet`}
          body={`Open Discover and click every poster you've ${mediaType === "game" ? "played" : "seen"}. Each click adds it here and pulls in similar titles.`}
          action={
            onDiscover ? (
              <button type="button" onClick={onDiscover} className={emptyActionClass}>
                <Compass className="size-4" />
                Start discovering
              </button>
            ) : undefined
          }
        />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={
            searchQuery.trim()
              ? `Nothing matches “${searchQuery.trim()}”`
              : "No titles match these filters"
          }
          body={`Only ${mediaType === "game" ? "games you've played" : "titles you've watched"} are searched here. Try a shorter name or clear the filters.`}
          action={
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setGenreFilter("");
                setYearFilter("");
                setLanguageFilter("");
              }}
              className="rounded-md bg-surface-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-border"
            >
              Clear search and filters
            </button>
          }
        />
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
