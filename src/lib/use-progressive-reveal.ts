"use client";

import { useEffect, useRef, useState } from "react";

const PAGE_SIZE = 60;

/**
 * Reveals a growing slice of an already-fetched list as the user scrolls,
 * instead of mounting every poster card (and its context menu) up front —
 * that's what was making large libraries feel slow to render.
 *
 * The revealed count resets only when `resetKey` changes (filters, sort,
 * search) — NOT when the items themselves change. A menu action (Hall of
 * Fame, remove, …) produces a new array; resetting then would collapse the
 * grid back to the first page and throw the user back to the top.
 */
export function useProgressiveReveal<T>(items: T[], resetKey: string) {
  const [count, setCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Adjusting state during render instead of in an effect avoids an extra
  // commit; see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevKey, setPrevKey] = useState(resetKey);
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setCount(PAGE_SIZE);
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || count >= items.length) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setCount((c) => Math.min(c + PAGE_SIZE, items.length));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, items.length]);

  return {
    visibleItems: items.slice(0, count),
    hasMore: count < items.length,
    sentinelRef,
  };
}
