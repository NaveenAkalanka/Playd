"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortMode = "added" | "title" | "year-desc" | "year-asc";

const control =
  "h-9 shrink-0 rounded-md border border-border bg-surface-2 px-2.5 text-sm text-text outline-none transition-colors hover:border-text-muted/40 focus:ring-2 focus:ring-accent";

/**
 * Library / wishlist / Hall of Fame toolbar.
 * Mobile: [search + trailing] on one row, filters in one swipeable row below.
 * sm+: everything on one wrapping row, trailing pinned right.
 */
export function FilterSortBar({
  sortMode,
  onSortChange,
  genreOptions,
  genreFilter,
  onGenreChange,
  yearOptions,
  yearFilter,
  onYearChange,
  languageOptions,
  languageFilter,
  onLanguageChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search",
  trailing,
}: {
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  genreOptions: string[];
  genreFilter: string;
  onGenreChange: (value: string) => void;
  yearOptions: number[];
  yearFilter: string;
  onYearChange: (value: string) => void;
  languageOptions: string[];
  languageFilter: string;
  onLanguageChange: (value: string) => void;
  /** When provided, renders a title search box filtering the loaded list. */
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Right-aligned slot, e.g. the view toggle. */
  trailing?: React.ReactNode;
}) {
  const hasActiveFilter = Boolean(genreFilter || yearFilter || languageFilter);

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {onSearchChange && (
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-60 sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={searchQuery ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              enterKeyHint="search"
              className={cn(control, "w-full pl-8 pr-8 placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden")}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-text-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          {trailing ? <div className="shrink-0 sm:hidden">{trailing}</div> : null}
        </div>
      )}

      <div className="flex items-center gap-2 sm:contents">
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] sm:flex-none sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden",
          // Bleed the swipe row to the screen edge, except where the pinned
          // toggle sits on the right.
          onSearchChange || !trailing ? "-mx-4 px-4 sm:mx-0" : "-ml-4 pl-4 sm:ml-0",
        )}
      >
        <select
          value={sortMode}
          onChange={(e) => onSortChange(e.target.value as SortMode)}
          aria-label="Sort"
          className={control}
        >
          <option value="added">Recently added</option>
          <option value="title">Title A–Z</option>
          <option value="year-desc">Year (newest)</option>
          <option value="year-asc">Year (oldest)</option>
        </select>

        {genreOptions.length > 0 && (
          <select
            value={genreFilter}
            onChange={(e) => onGenreChange(e.target.value)}
            aria-label="Genre"
            className={cn(control, genreFilter && "border-accent/60")}
          >
            <option value="">All genres</option>
            {genreOptions.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        )}

        {yearOptions.length > 0 && (
          <YearSelect
            value={yearFilter}
            onChange={onYearChange}
            options={yearOptions}
            className={cn(control, yearFilter && "border-accent/60")}
          />
        )}

        {languageOptions.length > 0 && (
          <select
            value={languageFilter}
            onChange={(e) => onLanguageChange(e.target.value)}
            aria-label="Original language"
            className={cn(control, languageFilter && "border-accent/60")}
          >
            <option value="">All languages</option>
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        )}

        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              onGenreChange("");
              onYearChange("");
              onLanguageChange("");
            }}
            className="flex h-9 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <X className="size-3.5" />
            Clear
          </button>
        )}

      </div>
        {!onSearchChange && trailing ? (
          <div className="shrink-0 sm:hidden">{trailing}</div>
        ) : null}
      </div>

      {trailing ? <div className="hidden sm:ml-auto sm:block">{trailing}</div> : null}
    </div>
  );
}

/**
 * Release-year dropdown shared by the library toolbars and Search. Picking
 * from a list means only real years can ever be chosen.
 */
export function YearSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: number[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Release year"
      className={cn(className, "tabular-nums")}
    >
      <option value="">All years</option>
      {options.map((year) => (
        <option key={year} value={String(year)}>
          {year}
        </option>
      ))}
    </select>
  );
}
