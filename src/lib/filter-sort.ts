import type { SortMode } from "@/components/filter-sort-bar";

interface Filterable {
  title: string;
  year: number | null;
  genres?: string[] | null;
  originalLanguage?: string | null;
}

export function applyFilterSort<T extends Filterable>(
  items: T[],
  options: {
    genreFilter: string;
    yearFilter: string;
    languageFilter: string;
    sortMode: SortMode;
  },
): T[] {
  const filtered = items.filter((item) => {
    if (options.genreFilter && !(item.genres ?? []).includes(options.genreFilter)) return false;
    if (options.yearFilter && String(item.year ?? "") !== options.yearFilter) return false;
    if (options.languageFilter && item.originalLanguage !== options.languageFilter) return false;
    return true;
  });

  // "added" is already the server's own order (addedAt desc) — no re-sort.
  if (options.sortMode === "added") return filtered;

  return [...filtered].sort((a, b) => {
    switch (options.sortMode) {
      case "title":
        return a.title.localeCompare(b.title);
      case "year-desc":
        return (b.year ?? 0) - (a.year ?? 0);
      case "year-asc":
        return (a.year ?? 0) - (b.year ?? 0);
      default:
        return 0;
    }
  });
}

export function deriveGenreOptions<T extends { genres?: string[] | null }>(items: T[]): string[] {
  const set = new Set<string>();
  for (const item of items) for (const genre of item.genres ?? []) set.add(genre);
  return [...set].sort();
}

export function deriveLanguageOptions<T extends { originalLanguage?: string | null }>(
  items: T[],
): string[] {
  const set = new Set<string>();
  for (const item of items) if (item.originalLanguage) set.add(item.originalLanguage);
  return [...set].sort();
}
