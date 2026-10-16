"use client";

import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { LibraryGrid } from "@/components/library-grid";
import { DiscoveryPopup } from "@/components/discovery-popup";
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

// Auto-open the popup on first visit, then again after this much idle time —
// not on every tab click.
const AUTO_OPEN_INTERVAL_MS = 60 * 60 * 1000;

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
    let lastShown = 0;
    try {
      lastShown = Number(localStorage.getItem(lastShownKey(mediaType)) ?? 0);
    } catch {
      // localStorage unavailable (private mode, etc.) — treat as first visit.
    }
    if (Date.now() - lastShown > AUTO_OPEN_INTERVAL_MS) {
      markShown();
      setPopupOpen(true);
    }
    // Only ever run once per mount — markShown intentionally excluded.
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
      <LibraryGrid mediaType={mediaType} items={items} />
      <DiscoveryPopup
        mediaType={mediaType}
        open={popupOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}
