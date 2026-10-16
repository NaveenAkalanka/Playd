export type MediaType = "movie" | "tv" | "game";

export interface NormalizedTitle {
  mediaType: MediaType;
  sourceId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  runtimeMinutes: number | null;
  originalLanguage: string | null;
}

export interface TitleCard {
  mediaType: MediaType;
  sourceId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  // Only populated by search/discover-listing calls (not recommendations),
  // used for client-side genre filtering on the search page.
  genreNames?: string[];
}
