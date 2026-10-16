"use client";

import { useEffect, useRef, useState } from "react";

const PAGE_SIZE = 60;

/**
 * Reveals a growing slice of an already-fetched list as the user scrolls,
 * instead of mounting every poster card (and its context menu) up front —
 * that's what was making large libraries feel slow to render. Resets
 * whenever the list reference changes (e.g. a filter/sort change produces
 * a new filtered array).
 */
export function useProgressiveReveal<T>(items: T[]) {
  const [count, setCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset the revealed count when the (already-memoized) item list changes
  // identity — e.g. a filter/sort change. Adjusting state during render
  // instead of in an effect avoids an extra commit; see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevItems, setPrevItems] = useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
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
