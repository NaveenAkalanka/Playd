"use client";

import { useSyncExternalStore } from "react";

export type ViewMode = "sm" | "md" | "lg" | "list";

const STORAGE_KEY = "playd:view-mode";

function isViewMode(value: string | null): value is ViewMode {
  return value === "sm" || value === "md" || value === "lg" || value === "list";
}

function subscribe(callback: () => void) {
  window.addEventListener(STORAGE_KEY, callback);
  return () => window.removeEventListener(STORAGE_KEY, callback);
}

function getSnapshot(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isViewMode(stored) ? stored : "md";
  } catch {
    return "md";
  }
}

function getServerSnapshot(): ViewMode {
  return "md";
}

export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function update(next: ViewMode) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore — preference just won't persist this session.
    }
    // The native "storage" event only fires in OTHER tabs, never the one
    // that made the change — dispatch our own so this tab re-renders too.
    window.dispatchEvent(new Event(STORAGE_KEY));
  }

  return [mode, update];
}
