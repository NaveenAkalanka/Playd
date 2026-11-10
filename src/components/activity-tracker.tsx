"use client";

import { useEffect } from "react";
import { touchActivity } from "@/lib/activity";

/** Feeds the app-wide idle timer used by the Discover popup. Renders nothing. */
export function ActivityTracker() {
  useEffect(() => {
    const onActivity = () => touchActivity();
    const onVisibility = () => {
      if (document.visibilityState === "visible") touchActivity();
    };

    touchActivity();
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const type of events) {
      window.addEventListener(type, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      for (const type of events) window.removeEventListener(type, onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
