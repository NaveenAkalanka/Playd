"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Optimistic overlay for a server-rendered list: hide or patch items the
 * moment the user acts, then let router.refresh() bring the real data. On a
 * failed action the caller undoes the overlay (unhide / unpatch), so the
 * grid reflects the click instantly but never lies for long.
 */
export function useOptimisticItems<T extends { id: number }>(serverItems: T[]) {
  const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set());
  const [patches, setPatches] = useState<ReadonlyMap<number, Partial<T>>>(() => new Map());

  const items = useMemo(
    () =>
      serverItems
        .filter((item) => !hidden.has(item.id))
        .map((item) => {
          const patch = patches.get(item.id);
          return patch ? { ...item, ...patch } : item;
        }),
    [serverItems, hidden, patches],
  );

  const hide = useCallback((id: number) => {
    setHidden((prev) => new Set(prev).add(id));
  }, []);

  const unhide = useCallback((id: number) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const patch = useCallback((id: number, value: Partial<T>) => {
    setPatches((prev) => new Map(prev).set(id, value));
  }, []);

  const unpatch = useCallback((id: number) => {
    setPatches((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return { items, hide, unhide, patch, unpatch };
}
