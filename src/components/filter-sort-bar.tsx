"use client";

export type SortMode = "added" | "title" | "year-desc" | "year-asc";

export function FilterSortBar({
  sortMode,
  onSortChange,
  genreOptions,
  genreFilter,
  onGenreChange,
  yearFilter,
  onYearChange,
  languageOptions,
  languageFilter,
  onLanguageChange,
}: {
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  genreOptions: string[];
  genreFilter: string;
  onGenreChange: (value: string) => void;
  yearFilter: string;
  onYearChange: (value: string) => void;
  languageOptions: string[];
  languageFilter: string;
  onLanguageChange: (value: string) => void;
}) {
  const hasActiveFilter = Boolean(genreFilter || yearFilter || languageFilter);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={sortMode}
        onChange={(e) => onSortChange(e.target.value as SortMode)}
        className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
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
          className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">All genres</option>
          {genreOptions.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      )}

      <input
        type="number"
        inputMode="numeric"
        value={yearFilter}
        onChange={(e) => onYearChange(e.target.value)}
        placeholder="Year"
        className="w-20 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />

      {languageOptions.length > 0 && (
        <select
          value={languageFilter}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
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
          className="text-sm font-medium text-text-muted hover:text-foreground"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
