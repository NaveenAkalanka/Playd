"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  movies as moviesTable,
  tvShows as tvShowsTable,
  games as gamesTable,
  moviesWishlist,
  tvShowsWishlist,
  gamesWishlist,
} from "@/db/schema";
import { requireAllowedUserOrThrow } from "@/lib/auth/guard";
import type { MediaType, TitleCard } from "@/lib/normalize";
import {
  discoverMovies,
  discoverTv,
  searchMovies,
  searchTv,
  getMovieGenres,
  getTvGenres,
} from "@/lib/tmdb";
import { getPopularGames, searchGames, getGameGenreNames } from "@/lib/igdb";

export interface SearchResult extends TitleCard {
  inLibrary: boolean;
  inWishlist: boolean;
}

const ALL_TYPES: MediaType[] = ["movie", "tv", "game"];
const PAGE_SIZE = 20;
const MAX_PAGE = 50;
const MAX_QUERY_LENGTH = 200;

// Clamp page to a sane range so a scripted/runaway client can't force
// unbounded, ever-incrementing calls to TMDB/IGDB.
function clampPage(page: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(Math.trunc(page), 1), MAX_PAGE);
}

function libraryTable(mediaType: MediaType) {
  switch (mediaType) {
    case "movie":
      return moviesTable;
    case "tv":
      return tvShowsTable;
    case "game":
      return gamesTable;
  }
}

function wishlistTable(mediaType: MediaType) {
  switch (mediaType) {
    case "movie":
      return moviesWishlist;
    case "tv":
      return tvShowsWishlist;
    case "game":
      return gamesWishlist;
  }
}

async function attachLibraryFlags(
  userId: string,
  cards: TitleCard[],
  types: MediaType[],
): Promise<SearchResult[]> {
  const libraryIds: Partial<Record<MediaType, Set<number>>> = {};
  const wishlistIds: Partial<Record<MediaType, Set<number>>> = {};

  await Promise.all(
    types.map(async (type) => {
      const libTable = libraryTable(type);
      const wlTable = wishlistTable(type);
      const [lib, wl] = await Promise.all([
        db.select({ sourceId: libTable.sourceId }).from(libTable).where(eq(libTable.userId, userId)),
        db.select({ sourceId: wlTable.sourceId }).from(wlTable).where(eq(wlTable.userId, userId)),
      ]);
      libraryIds[type] = new Set(lib.map((r) => r.sourceId));
      wishlistIds[type] = new Set(wl.map((r) => r.sourceId));
    }),
  );

  return cards.map((card) => ({
    ...card,
    inLibrary: libraryIds[card.mediaType]?.has(card.sourceId) ?? false,
    inWishlist: wishlistIds[card.mediaType]?.has(card.sourceId) ?? false,
  }));
}

// mediaType narrows the search to one type (locked search from a Movies/TV/
// Games tab) — omitted means search everything, same as before. page lets
// the search page load more results as you scroll instead of a fixed cap.
export async function searchAll(
  query: string,
  mediaType?: MediaType,
  page = 1,
): Promise<SearchResult[]> {
  const user = await requireAllowedUserOrThrow();
  const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (!trimmed) return [];
  const safePage = clampPage(page);

  const types = mediaType ? [mediaType] : ALL_TYPES;

  const results = await Promise.all(
    types.map(async (type): Promise<TitleCard[]> => {
      if (type === "movie") return searchMovies(trimmed, safePage).catch(() => []);
      if (type === "tv") return searchTv(trimmed, safePage).catch(() => []);
      return searchGames(trimmed, PAGE_SIZE, (safePage - 1) * PAGE_SIZE).catch(() => []);
    }),
  );

  return attachLibraryFlags(user.id, results.flat(), types);
}

// Shown on the search page for a locked type before anything is typed, so
// search isn't just a blank box — reuses the popup's popular-titles sources
// but without its English/Korean-only language filter. Same page param as
// searchAll, for the same infinite-scroll loading.
export async function getPopularByType(
  mediaType: MediaType,
  page = 1,
): Promise<SearchResult[]> {
  const user = await requireAllowedUserOrThrow();
  const safePage = clampPage(page);

  let cards: TitleCard[];
  if (mediaType === "movie") {
    cards = await discoverMovies(undefined, safePage).catch(() => []);
  } else if (mediaType === "tv") {
    cards = await discoverTv(undefined, safePage).catch(() => []);
  } else {
    cards = await getPopularGames(PAGE_SIZE, (safePage - 1) * PAGE_SIZE).catch(() => []);
  }

  return attachLibraryFlags(user.id, cards, [mediaType]);
}

export async function getGenreNamesForType(mediaType: MediaType): Promise<string[]> {
  await requireAllowedUserOrThrow();

  if (mediaType === "movie") return (await getMovieGenres()).map((g) => g.name).sort();
  if (mediaType === "tv") return (await getTvGenres()).map((g) => g.name).sort();
  return [...(await getGameGenreNames())].sort();
}
