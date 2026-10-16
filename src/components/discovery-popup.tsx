"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { PosterCard } from "@/components/poster-card";
import { cn } from "@/lib/utils";
import type { MediaType, TitleCard } from "@/lib/normalize";
import { addItem, getDiscoveryContext, removeItem } from "@/lib/actions/items";
import { getDiscoveryBatch, getRecommendationsFor } from "@/lib/actions/discovery";
import { addToWishlist, removeFromWishlist } from "@/lib/actions/wishlist";
import { useUndoToast } from "@/components/undo-toast-provider";

// The popup grid is 3/4/5 columns depending on viewport (see the grid
// className below) — 60 is the LCM of those, so a full batch always ends
// on a complete row instead of a dangling short one at some breakpoint.
const BATCH_SIZE = 60;
const SIMILAR_RATIO = 0.7;
// Pure safety valve against a pathological infinite loop — NOT a proxy for
// "ran out of titles". A page full of titles already in the library/
// wishlisted is common for an active user and must not count toward running
// out; only MAX_EMPTY_PAGE_STREAK (truly empty API pages) decides that.
const MAX_TAKE_ATTEMPTS = 5000;
const MAX_EMPTY_PAGE_STREAK = 3;
// TMDB/IGDB discover endpoints are deterministic per page, so always
// starting from page 1 showed the exact same titles on every open. Starting
// from a random page in this range (still well within the popularity/vote
// filters, so quality stays high) gives a different mix each time.
const RANDOM_START_PAGE_RANGE = 15;

function cardKey(mediaType: MediaType, sourceId: number) {
  return `${mediaType}:${sourceId}`;
}

const mediaTypeLabel: Record<MediaType, string> = {
  movie: "movies",
  tv: "TV",
  game: "games",
};

export function DiscoveryPopup({
  mediaType,
  open,
  onOpenChange,
}: {
  mediaType: MediaType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { showUndoToast } = useUndoToast();
  const router = useRouter();
  const [batch, setBatch] = useState<TitleCard[]>([]);
  const [loading, setLoading] = useState(false);

  const fresh = useRef<TitleCard[]>([]);
  const similar = useRef<TitleCard[]>([]);
  const freshPage = useRef(1);
  const exclude = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const elToKeyRef = useRef<Map<Element, string>>(new Map());
  const currentKeysRef = useRef<Set<string>>(new Set());

  const refillFresh = useCallback(async () => {
    const before = fresh.current.length;
    const more = await getDiscoveryBatch(mediaType, freshPage.current);
    freshPage.current += 1;
    fresh.current.push(...more);
    return fresh.current.length - before;
  }, [mediaType]);

  const takeNext = useCallback(async (): Promise<TitleCard | null> => {
    let emptyPageStreak = 0;
    for (let attempt = 0; attempt < MAX_TAKE_ATTEMPTS; attempt++) {
      if (fresh.current.length === 0 && similar.current.length === 0) {
        const fetched = await refillFresh();
        if (fetched === 0) {
          emptyPageStreak++;
          // A single thin/empty page isn't proof we're out of titles —
          // TMDB/IGDB pages can come back short. Only give up after a
          // few consecutive misses.
          if (emptyPageStreak >= MAX_EMPTY_PAGE_STREAK) return null;
          continue;
        }
        emptyPageStreak = 0;
      }

      const useSimilar =
        similar.current.length > 0 &&
        (fresh.current.length === 0 || Math.random() < SIMILAR_RATIO);
      const source = useSimilar ? similar.current : fresh.current;
      if (source.length === 0) continue;

      const candidate = source.shift()!;
      const k = cardKey(candidate.mediaType, candidate.sourceId);
      if (exclude.current.has(k)) continue;
      exclude.current.add(k);
      return candidate;
    }
    return null;
  }, [refillFresh]);

  const buildBatch = useCallback(
    async (size: number) => {
      const next: TitleCard[] = [];
      while (next.length < size) {
        const item = await takeNext();
        if (!item) break;
        next.push(item);
      }
      return next;
    },
    [takeNext],
  );

  useEffect(() => {
    if (!open || initialized.current) return;
    initialized.current = true;
    setLoading(true);

    (async () => {
      const startPage = 1 + Math.floor(Math.random() * RANDOM_START_PAGE_RANGE);
      const [context, initialPage] = await Promise.all([
        getDiscoveryContext(mediaType),
        getDiscoveryBatch(mediaType, startPage),
      ]);
      freshPage.current = startPage + 1;
      for (const id of context.library) exclude.current.add(cardKey(mediaType, id));
      for (const id of context.wishlisted) exclude.current.add(cardKey(mediaType, id));
      fresh.current = initialPage;

      const firstBatch = await buildBatch(BATCH_SIZE);
      setBatch(firstBatch);
      setLoading(false);
    })();
  }, [open, mediaType, buildBatch]);

  // Keep a ref mirror of which keys are currently on screen so async
  // callbacks (observer, network replies) can check membership without
  // reading stale closures.
  useEffect(() => {
    currentKeysRef.current = new Set(
      batch.map((c) => cardKey(c.mediaType, c.sourceId)),
    );
  }, [batch]);

  function handlePassedOver(key: string) {
    if (!currentKeysRef.current.has(key)) return;
    setBatch((prev) => prev.filter((c) => cardKey(c.mediaType, c.sourceId) !== key));

    (async () => {
      const replacement = await takeNext();
      if (replacement) setBatch((prev) => [...prev, replacement]);
    })();
  }

  // Cards that scroll past unclicked are assumed unwanted and get quietly
  // cycled out for something else — this is what lets a whole ignored row
  // turn over without needing an explicit "none of these" button.
  useEffect(() => {
    if (!open) return;
    const root = scrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = elToKeyRef.current.get(entry.target);
          if (!key) continue;

          if (entry.isIntersecting) {
            seen.current.add(key);
            continue;
          }

          const exitedAbove =
            entry.rootBounds != null && entry.boundingClientRect.bottom < entry.rootBounds.top;
          if (seen.current.has(key) && exitedAbove) {
            seen.current.delete(key);
            handlePassedOver(key);
          }
        }
      },
      { root, threshold: 0 },
    );
    observerRef.current = observer;
    for (const el of cardElsRef.current.values()) observer.observe(el);

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A single stable ref callback for every card: React only invokes it on
  // actual mount/unmount (not on every render), and the returned cleanup
  // closes over the exact element it attached to — no per-key cache, and
  // nothing touches ref.current during render.
  function cardRefCallback(el: HTMLDivElement | null) {
    if (!el) return;
    const key = el.dataset.cardKey!;
    cardElsRef.current.set(key, el);
    elToKeyRef.current.set(el, key);
    observerRef.current?.observe(el);

    return () => {
      cardElsRef.current.delete(key);
      elToKeyRef.current.delete(el);
      observerRef.current?.unobserve(el);
    };
  }

  // Shared by "add to library" and "add to wishlist": pull this title's own
  // recommendations, use the first unseen one as the direct replacement for
  // the slot just vacated, and front-load the rest into the similar queue.
  async function pickSimilarReplacement(card: TitleCard): Promise<TitleCard | null> {
    const recs = await getRecommendationsFor(card.mediaType, card.sourceId);

    let replacement: TitleCard | null = null;
    const toQueue: TitleCard[] = [];
    for (const rec of recs) {
      const rk = cardKey(rec.mediaType, rec.sourceId);
      if (exclude.current.has(rk)) continue;
      exclude.current.add(rk);
      if (!replacement) {
        replacement = rec;
      } else {
        toQueue.push(rec);
      }
    }
    if (toQueue.length) similar.current.unshift(...toQueue);

    return replacement ?? (await takeNext());
  }

  function removeCardFromBatch(card: TitleCard) {
    const k = cardKey(card.mediaType, card.sourceId);
    // Only this one slot changes — everything else you haven't acted on
    // yet stays put so acting on a card never yanks away something you
    // were about to pick next.
    setBatch((prev) => prev.filter((c) => cardKey(c.mediaType, c.sourceId) !== k));
  }

  function handleAdd(card: TitleCard) {
    removeCardFromBatch(card);

    (async () => {
      const [replacement, inserted] = await Promise.all([
        pickSimilarReplacement(card),
        addItem(card.mediaType, card.sourceId),
      ]);

      if (replacement) setBatch((prev) => [...prev, replacement]);

      if (inserted) {
        router.refresh();
        showUndoToast({
          title: card.title,
          onUndo: () => {
            removeItem(card.mediaType, inserted.id);
            router.refresh();
          },
        });
      }
    })();
  }

  function handleAddToWishlist(card: TitleCard) {
    removeCardFromBatch(card);

    (async () => {
      const [replacement, inserted] = await Promise.all([
        pickSimilarReplacement(card),
        addToWishlist(card.mediaType, card.sourceId),
      ]);

      if (replacement) setBatch((prev) => [...prev, replacement]);

      if (inserted) {
        router.refresh();
        showUndoToast({
          title: card.title,
          action: "Wishlisted",
          onUndo: () => {
            removeFromWishlist(card.mediaType, inserted.id);
            router.refresh();
          },
        });
      }
    })();
  }

  async function handleShowMore() {
    setLoading(true);
    // Everything still visible at this point was never clicked — exclude it
    // for the rest of this session so it doesn't immediately reappear, but
    // (unlike the old behavior) nothing is persisted, so it's fair game
    // again next time the popup opens.
    for (const card of batch) {
      exclude.current.add(cardKey(card.mediaType, card.sourceId));
    }

    const nextBatch = await buildBatch(BATCH_SIZE);
    setBatch(nextBatch);
    setLoading(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  async function handleRefresh() {
    setLoading(true);
    const nextBatch = await buildBatch(BATCH_SIZE);
    setBatch(nextBatch);
    setLoading(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="fixed inset-0 top-0 left-0 flex h-full w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[85vh] sm:max-h-[85vh] sm:w-full sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
      >
        <DialogHeader className="flex-row items-center justify-between border-b border-border px-4 py-3 pr-12">
          <DialogTitle>Discover {mediaTypeLabel[mediaType]}</DialogTitle>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Refresh suggestions"
            className="flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-border disabled:opacity-60"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
        </DialogHeader>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
          {batch.length === 0 && !loading ? (
            <p className="py-24 text-center text-text-muted">
              No more titles right now.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {batch.map((card) => {
                const k = cardKey(card.mediaType, card.sourceId);
                return (
                  <ContextMenu key={k}>
                    <ContextMenuTrigger asChild>
                      <div ref={cardRefCallback} data-card-key={k}>
                        <PosterCard
                          title={card.title}
                          year={card.year}
                          posterUrl={card.posterUrl}
                          onClick={() => handleAdd(card)}
                        />
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onSelect={() => handleAddToWishlist(card)}>
                        Add to wishlist
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-center border-t border-border p-3">
          <button
            type="button"
            onClick={handleShowMore}
            disabled={loading}
            className="rounded-md bg-surface-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-border disabled:opacity-60"
          >
            {loading ? "Loading…" : "Show more"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
