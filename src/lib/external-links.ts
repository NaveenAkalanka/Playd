import type { MediaType } from "@/lib/normalize";

/**
 * Where "View more info" sends you. Movies/TV use their TMDB id directly —
 * sourceId *is* the TMDB id. IGDB doesn't expose a stable public URL from an
 * id alone (it needs the game's slug, which we don't store), so games fall
 * back to an IGDB site search by title.
 */
export function externalInfoUrl(mediaType: MediaType, sourceId: number, title: string): string {
  switch (mediaType) {
    case "movie":
      return `https://www.themoviedb.org/movie/${sourceId}`;
    case "tv":
      return `https://www.themoviedb.org/tv/${sourceId}`;
    case "game":
      return `https://www.igdb.com/search?q=${encodeURIComponent(title)}`;
  }
}
