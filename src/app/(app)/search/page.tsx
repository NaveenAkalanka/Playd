"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
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

function resultKey(result: SearchResult) {
  return `${result.mediaType}:${result.sourceId}`;
}

const typeLabel: Record<MediaType, string> = {
  movie: "movies",
  tv: "TV",
  game: "games",
};

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

  useEffect(() => {
    // The genre/year filter row is only rendered while lockedType is set
    // (see below), so there's nothing to reset when it's null — stale
    // options just sit unused until a type locks in again.
    if (!lockedType) return;
    setGenreFilter("");
    getGenreNamesForType(lockedType).then(setGenreOptions);
  }, [lockedType]);

  useEffect(() => {
    const trimmed = query.trim();
    pageRef.current = 1;
    hasMoreRef.current = true;

    if (!trimmed) {
      if (!lockedType) {
        setResults([]);
        setLoading(false);
        return;
      }
      // Nothing typed yet — show popular titles for this type so search
      // isn't just a blank box.
      setLoading(true);
      getPopularByType(lockedType).then((data) => {
        setResults(data);
        setDismissedKeys(new Set());
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const data = await searchAll(trimmed, lockedType ?? undefined);
      setResults(data);
      setDismissedKeys(new Set());
      setLoading(false);
    }, 400);

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
    const data = trimmed
      ? await searchAll(trimmed, lockedType ?? undefined, nextPage)
      : lockedType
        ? await getPopularByType(lockedType, nextPage)
        : [];

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

  function handleAdd(result: SearchResult) {
    const k = resultKey(result);
    // Remove immediately rather than marking it added.
    setDismissedKeys((prev) => new Set(prev).add(k));

    addItem(result.mediaType, result.sourceId).then((inserted) => {
      if (inserted) {
        router.refresh();
        showUndoToast({
          title: result.title,
          onUndo: () => {
            removeItem(result.mediaType, inserted.id);
            router.refresh();
          },
        });
      }
    });
  }

  function handleAddToWishlist(result: SearchResult) {
    const k = resultKey(result);
    setDismissedKeys((prev) => new Set(prev).add(k));

    addToWishlist(result.mediaType, result.sourceId).then((inserted) => {
      if (inserted) {
        router.refresh();
        showUndoToast({
          title: result.title,
          action: "Wishlisted",
          onUndo: () => {
            removeFromWishlist(result.mediaType, inserted.id);
            router.refresh();
          },
        });
      }
    });
  }

  const visibleResults = results.filter((result) => {
    if (result.inLibrary || result.inWishlist) return false;
    if (dismissedKeys.has(resultKey(result))) return false;
    if (genreFilter && !result.genreNames?.includes(genreFilter)) return false;
    if (yearFilter && String(result.year ?? "") !== yearFilter) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            lockedType ? `Search ${typeLabel[lockedType]}…` : "Search movies, TV and games…"
          }
          autoFocus
          maxLength={200}
          className="w-full rounded-md border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close search"
          className="flex size-10 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      {lockedType && (
        <div className="mb-6 flex items-center gap-2">
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">All genres</option>
            {genreOptions.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            placeholder="Year"
            className="w-24 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
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

      {loading && <p className="text-sm text-text-muted">Searching…</p>}
      {!loading && visibleResults.length === 0 && (
        <p className="text-sm text-text-muted">No results.</p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
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

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}
