import type { SortMode } from "@/components/filter-sort-bar";

// Year filter bounds: nothing on TMDB/IGDB predates early cinema, and a
// couple of years ahead covers announced titles.
export const MIN_YEAR = 1870;
export function maxYear() {
  return new Date().getFullYear() + 2;
}

/** The year as a number if it's a complete, plausible year; otherwise null. */
export function validYear(value: string): number | null {
  if (!/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= MIN_YEAR && year <= maxYear() ? year : null;
}

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
    /** Case-insensitive title substring match; empty = no filter. */
    query?: string;
  },
): T[] {
  const needle = options.query?.trim().toLocaleLowerCase() ?? "";
  // A partial ("19") or out-of-range entry doesn't filter at all, rather
  // than emptying the grid.
  const year = validYear(options.yearFilter);
  const filtered = items.filter((item) => {
    if (needle && !item.title.toLocaleLowerCase().includes(needle)) return false;
    if (options.genreFilter && !(item.genres ?? []).includes(options.genreFilter)) return false;
    if (year !== null && item.year !== year) return false;
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

/** Years present in a list, newest first — for the library-style dropdowns. */
export function deriveYearOptions<T extends { year: number | null }>(items: T[]): number[] {
  const set = new Set<number>();
  for (const item of items) if (item.year && validYear(String(item.year)) !== null) set.add(item.year);
  return [...set].sort((a, b) => b - a);
}

/** Every allowed year, newest first — for Search, which has no list to derive from. */
export function allYearOptions(): number[] {
  const years: number[] = [];
  for (let y = maxYear(); y >= MIN_YEAR; y--) years.push(y);
  return years;
}
