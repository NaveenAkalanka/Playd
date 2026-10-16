"use server";

import { requireAllowedUserOrThrow } from "@/lib/auth/guard";
import { getLibraryLanguageCounts } from "@/lib/actions/items";
import type { MediaType, TitleCard } from "@/lib/normalize";
import {
  discoverMovies,
  discoverTv,
  getMovieRecommendations,
  getTvRecommendations,
} from "@/lib/tmdb";
import { getPopularGames, getSimilarGames } from "@/lib/igdb";

const GAMES_PAGE_SIZE = 20;

function withPoster(cards: TitleCard[]): TitleCard[] {
  // Posterless titles render as a bare text box in the grid, which reads as
  // a missing/broken card — leave them out of discovery entirely.
  return cards.filter((card) => card.posterUrl !== null);
}

// Mix two lists in proportion to their weights (credit-based weighted
// round robin) instead of a flat 1:1 alternation, so a language you've
// barely watched doesn't flood the suggestions just as much as the one
// you actually watch.
function weightedInterleave<T>(
  primary: T[],
  secondary: T[],
  primaryWeight: number,
  secondaryWeight: number,
): T[] {
  const out: T[] = [];
  const totalWeight = primaryWeight + secondaryWeight || 1;
  let primaryCredit = 0;
  let secondaryCredit = 0;
  let pi = 0;
  let si = 0;

  while (pi < primary.length || si < secondary.length) {
    primaryCredit += primaryWeight;
    secondaryCredit += secondaryWeight;

    if (pi < primary.length && (si >= secondary.length || primaryCredit >= secondaryCredit)) {
      out.push(primary[pi++]);
      primaryCredit -= totalWeight;
    } else if (si < secondary.length) {
      out.push(secondary[si++]);
      secondaryCredit -= totalWeight;
    }
  }

  return out;
}

export async function getDiscoveryBatch(
  mediaType: MediaType,
  page: number,
): Promise<TitleCard[]> {
  await requireAllowedUserOrThrow();

  if (mediaType === "movie" || mediaType === "tv") {
    const discover = mediaType === "movie" ? discoverMovies : discoverTv;
    const [languageCounts, en, ko] = await Promise.all([
      getLibraryLanguageCounts(mediaType),
      discover("en", page),
      discover("ko", page),
    ]);
    // A language with zero watched titles still gets a weight of 1, so it
    // keeps a small foothold for discovery rather than disappearing.
    const enWeight = Math.max(languageCounts.en ?? 0, 1);
    const koWeight = Math.max(languageCounts.ko ?? 0, 1);
    return withPoster(weightedInterleave(en, ko, enWeight, koWeight));
  }

  return withPoster(
    await getPopularGames(GAMES_PAGE_SIZE, (page - 1) * GAMES_PAGE_SIZE),
  );
}

export async function getRecommendationsFor(
  mediaType: MediaType,
  sourceId: number,
): Promise<TitleCard[]> {
  await requireAllowedUserOrThrow();

  if (mediaType === "movie") return withPoster(await getMovieRecommendations(sourceId));
  if (mediaType === "tv") return withPoster(await getTvRecommendations(sourceId));
  return withPoster(await getSimilarGames(sourceId));
}
