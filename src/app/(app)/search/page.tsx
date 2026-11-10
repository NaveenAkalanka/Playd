"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SearchX, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { PosterCard } from "@/components/poster-card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  searchAll,
  getPopularByType,
  getGenreNamesForType,
  type SearchResult,
} from "@/lib/actions/search";
import { useUndoToast } from "@/components/undo-toast-provider";
import { addItem, removeItem } from "@/lib/actions/items";
import { addToWishlist, removeFromWishlist } from "@/lib/actions/wishlist";
import type { MediaType } from "@/lib/normalize";
import { externalInfoUrl } from "@/lib/external-links";
import { YearSelect } from "@/components/filter-sort-bar";
import { allYearOptions, validYear } from "@/lib/filter-sort";

function resultKey(result: SearchResult) {
  return `${result.mediaType}:${result.sourceId}`;
}

const typeLabel: Record<MediaType, string> = {
  movie: "movies",
  tv: "TV",
  game: "games",
};

const SEARCH_YEAR_OPTIONS = allYearOptions();

function isMediaType(value: string | null): value is MediaType {
  return value === "movie" || value === "tv" || value === "game";
}

function SearchPageInner() {
  const { showUndoToast } = useUndoToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedType = isMediaType(searchParams.get("type")) ? searchParams.get("type") as MediaType : null;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [genreOptions, setGenreOptions] = useState<string[]>([]);
  const [genreFilter, setGenreFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Each new query/type bumps this; any response from an older request is
  // dropped, so a slow earlier search can't overwrite newer results.
  const requestIdRef = useRef(0);
  // Which query the shown results belong to. While it differs from what's
  // typed (debounce window or request in flight) the page counts as busy.
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const currentKey = `${lockedType ?? "all"}|${query.trim()}`;
  const busy = loading || settledKey !== currentKey;

  useEffect(() => {
    // The genre/year filter row is only rendered while lockedType is set.
    // Switching type remounts this component (see SearchPage), so filters
    // start fresh without resetting them here.
    if (!lockedType) return;
    getGenreNamesForType(lockedType)
      .then(setGenreOptions)
      .catch(() => setGenreOptions([]));
  }, [lockedType]);

  useEffect(() => {
    const trimmed = query.trim();
    const key = `${lockedType ?? "all"}|${trimmed}`;
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;
    pageRef.current = 1;
    hasMoreRef.current = true;

    // Typed queries are debounced; the popular list (nothing typed) loads
    // right away.
    const timer = setTimeout(async () => {
      if (!trimmed && !lockedType) {
        setResults([]);
        setSettledKey(key);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Nothing typed yet on a locked type — show popular titles so
        // search isn't just a blank box.
        const data = trimmed
          ? await searchAll(trimmed, lockedType ?? undefined)
          : await getPopularByType(lockedType!);
        if (!isCurrent()) return;
        setResults(data);
        setDismissedKeys(new Set());
      } catch (error) {
        if (isCurrent()) console.error("[search] search failed", error);
      } finally {
        if (isCurrent()) {
          setSettledKey(key);
          setLoading(false);
        }
      }
    }, trimmed ? 400 : 0);

    return () => clearTimeout(timer);
  }, [query, lockedType]);

  // Infinite scroll: load the next page once the sentinel at the bottom of
  // the grid comes into view, instead of capping results at one page.
  async function loadMore() {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    const trimmed = query.trim();
    const nextPage = pageRef.current + 1;
    const requestId = requestIdRef.current;
    let data: SearchResult[] = [];
    try {
      data = trimmed
        ? await searchAll(trimmed, lockedType ?? undefined, nextPage)
        : lockedType
          ? await getPopularByType(lockedType, nextPage)
          : [];
    } catch (error) {
      // Leave hasMore set so the next scroll can try this page again.
      console.error("[search] load more failed", error);
      loadingMoreRef.current = false;
      setLoadingMore(false);
      return;
    }

    // The query changed while this page was loading — it belongs to the old
    // results, so don't append it to the new ones.
    if (requestId !== requestIdRef.current) {
      loadingMoreRef.current = false;
      setLoadingMore(false);
      return;
    }

    if (data.length === 0) {
      hasMoreRef.current = false;
    } else {
      pageRef.current = nextPage;
      setResults((prev) => {
        const seen = new Set(prev.map(resultKey));
        return [...prev, ...data.filter((r) => !seen.has(resultKey(r)))];
      });
    }

    loadingMoreRef.current = false;
    setLoadingMore(false);
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, lockedType]);

  function restore(key: string) {
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function handleAdd(result: SearchResult) {
    const k = resultKey(result);
    // Remove immediately rather than marking it added.
    setDismissedKeys((prev) => new Set(prev).add(k));

    addItem(result.mediaType, result.sourceId).catch((error) => {
      console.error("[search] add failed", error);
      restore(k);
      showUndoToast({ title: result.title, action: "Couldn't add" });
      return null;
    }).then((inserted) => {
      if (inserted) {
        router.refresh();
        showUndoToast({
          title: result.title,
          onUndo: async () => {
            await removeItem(result.mediaType, inserted.id);
            restore(k);
            router.refresh();
          },
        });
      }
    });
  }

  function handleAddToWishlist(result: SearchResult) {
    const k = resultKey(result);
    setDismissedKeys((prev) => new Set(prev).add(k));

    addToWishlist(result.mediaType, result.sourceId).catch((error) => {
      console.error("[search] wishlist add failed", error);
      restore(k);
      showUndoToast({ title: result.title, action: "Couldn't wishlist" });
      return null;
    }).then((inserted) => {
      if (inserted) {
        router.refresh();
        showUndoToast({
          title: result.title,
          action: "Wishlisted",
          onUndo: async () => {
            await removeFromWishlist(result.mediaType, inserted.id);
            restore(k);
            router.refresh();
          },
        });
      }
    });
  }

  const filterYear = validYear(yearFilter);
  const visibleResults = results.filter((result) => {
    if (result.inLibrary || result.inWishlist) return false;
    if (dismissedKeys.has(resultKey(result))) return false;
    if (genreFilter && !result.genreNames?.includes(genreFilter)) return false;
    if (filterYear !== null && result.year !== filterYear) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pb-6 pt-3">
      {/* Search + filters stay pinned under the top nav while results scroll. */}
      <div className="sticky top-14 z-30 -mx-4 mb-4 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          enterKeyHint="search"
          aria-label="Search titles"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            lockedType ? `Search ${typeLabel[lockedType]}…` : "Search movies, TV and games…"
          }
          autoFocus
          maxLength={200}
          className="h-12 w-full rounded-lg border border-border bg-surface-2 pl-11 pr-4 text-base outline-none placeholder:text-text-muted focus:ring-2 focus:ring-accent [&::-webkit-search-cancel-button]:hidden"
        />
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close search"
          className="flex size-12 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      {lockedType && (
        <div className="mt-3 flex items-center gap-2">
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface-2 px-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">All genres</option>
            {genreOptions.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
          <YearSelect
            value={yearFilter}
            onChange={setYearFilter}
            options={SEARCH_YEAR_OPTIONS}
            className={cn(
              "h-9 rounded-md border border-border bg-surface-2 px-2.5 text-sm outline-none focus:ring-2 focus:ring-accent",
              yearFilter && "border-accent/60",
            )}
          />
          {(genreFilter || yearFilter) && (
            <button
              type="button"
              onClick={() => {
                setGenreFilter("");
                setYearFilter("");
              }}
              className="text-sm font-medium text-text-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}
      </div>

      {busy && visibleResults.length === 0 && (
        <div
          aria-busy="true"
          aria-label="Searching"
          className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[2/3] rounded-[6px]" />
          ))}
        </div>
      )}
      {!busy && visibleResults.length === 0 && (
        query.trim() ? (
          <EmptyState
            icon={SearchX}
            title={`No results for “${query.trim()}”`}
            body="Titles already in your library or wishlist are hidden here. Try a different spelling, or the original-language title."
          />
        ) : !lockedType ? (
          <EmptyState
            icon={Search}
            title="Search movies, TV and games"
            body="Click a poster to log it as seen. Right-click, or long-press on touch, to save it to your wishlist instead."
          />
        ) : (
          <EmptyState icon={SearchX} title="Nothing new to show" body="Type a title to search." />
        )
      )}

      <div
        className={cn(
          "grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 transition-opacity",
          busy && visibleResults.length > 0 && "opacity-60",
        )}
      >
        {visibleResults.map((result) => {
          const k = resultKey(result);
          return (
            <ContextMenu key={k}>
              <ContextMenuTrigger asChild>
                <div>
                  <PosterCard
                    title={result.title}
                    year={result.year}
                    posterUrl={result.posterUrl}
                    onClick={() => handleAdd(result)}
                  />
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => handleAddToWishlist(result)}>
                  Add to wishlist
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() =>
                    window.open(
                      externalInfoUrl(result.mediaType, result.sourceId, result.title),
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  View more info
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <p className="py-4 text-center text-sm text-text-muted">Loading more…</p>
      )}
    </div>
  );
}

// Keyed on the locked type so switching Movies/TV/Games search starts with
// fresh query, filters and results instead of resetting them in an effect.
function SearchPageKeyed() {
  const type = useSearchParams().get("type");
  return <SearchPageInner key={type ?? "all"} />;
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageKeyed />
    </Suspense>
  );
}
