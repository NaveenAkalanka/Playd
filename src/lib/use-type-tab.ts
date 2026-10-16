"use client";

import { useSyncExternalStore } from "react";
import type { MediaType } from "@/lib/normalize";

const EVENT = "playd:type-tab-changed";

function parseType(search: string): MediaType {
  const param = new URLSearchParams(search).get("type");
  return param === "tv" || param === "game" ? param : "movie";
}

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function getSnapshot(): MediaType {
  return parseType(window.location.search);
}

function getServerSnapshot(): MediaType {
  return "movie";
}

/**
 * Keeps a Movies/TV/Games sub-tab (Wishlist, Hall of Fame) reflected in the
 * URL via history.pushState rather than Next's router — switching tabs
 * stays instant (every type's data is already loaded client-side, so there
 * is nothing to re-fetch) while still producing a real history entry, so
 * browser back/forward steps through tab changes correctly.
 */
export function useTypeTab(): [MediaType, (type: MediaType) => void] {
  const active = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setActive(type: MediaType) {
    if (type === getSnapshot()) return;
    const url = new URL(window.location.href);
    url.searchParams.set("type", type);
    window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(EVENT));
  }

  return [active, setActive];
}
