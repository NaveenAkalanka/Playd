import "server-only";
import type { MediaType } from "@/lib/normalize";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb";
import { getGameDetails } from "@/lib/igdb";

export async function fetchTitleDetails(mediaType: MediaType, sourceId: number) {
  switch (mediaType) {
    case "movie":
      return getMovieDetails(sourceId);
    case "tv":
      return getTvDetails(sourceId);
    case "game":
      return getGameDetails(sourceId);
  }
}
