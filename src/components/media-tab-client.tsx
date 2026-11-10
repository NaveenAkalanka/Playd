"use client";

import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { LibraryGrid } from "@/components/library-grid";
import { DiscoveryPopup } from "@/components/discovery-popup";
import { RESUMED_EVENT, readResumedAt, touchActivity } from "@/lib/activity";
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

const heading: Record<MediaType, string> = {
  movie: "Movies",
  tv: "TV",
  game: "Games",
};

// Auto-open the popup the first time this tab is ever opened, and again
// when you come back to the app after an hour of inactivity (see
// lib/activity.ts) — not merely because an hour has passed while you've
// been actively using the app.
function lastShownKey(mediaType: MediaType) {
  return `playd:popup-last-shown:${mediaType}`;
}

export function MediaTabClient({
  mediaType,
  items,
}: {
  mediaType: MediaType;
  items: LibraryItem[];
}) {
  const [popupOpen, setPopupOpen] = useState(false);

  function markShown() {
    try {
      localStorage.setItem(lastShownKey(mediaType), String(Date.now()));
    } catch {
      // Ignore — just means it may pop up again sooner than intended.
    }
  }

  useEffect(() => {
    function maybeAutoOpen() {
      // Record this visit first so a return after an idle hour is detected
      // even if this runs before the app-wide ActivityTracker does.
      touchActivity();
      let lastShown = 0;
      try {
        lastShown = Number(localStorage.getItem(lastShownKey(mediaType)) ?? 0) || 0;
      } catch {
        // localStorage unavailable (private mode, etc.) — treat as first visit.
      }
      if (!lastShown || readResumedAt() > lastShown) {
        markShown();
        setPopupOpen(true);
      }
    }

    // Deferred to a task so the open happens as a response to the external
    // check, not synchronously inside the effect body.
    const timer = setTimeout(maybeAutoOpen, 0);
    // Also catch a return from idle while this tab is already open.
    window.addEventListener(RESUMED_EVENT, maybeAutoOpen);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(RESUMED_EVENT, maybeAutoOpen);
    };
    // markShown intentionally excluded — it only depends on mediaType.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) markShown();
    setPopupOpen(nextOpen);
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-2xl font-bold">{heading[mediaType]}</h1>
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          className="flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-border"
        >
          <Compass className="size-4" />
          Discover
        </button>
      </div>
      <LibraryGrid
        mediaType={mediaType}
        items={items}
        onDiscover={() => handleOpenChange(true)}
      />
      <DiscoveryPopup
        mediaType={mediaType}
        open={popupOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}
