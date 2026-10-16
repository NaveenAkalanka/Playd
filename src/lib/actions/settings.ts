"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  movies,
  tvShows,
  games,
  moviesWishlist,
  tvShowsWishlist,
  gamesWishlist,
} from "@/db/schema";
import { requireAllowedUserOrThrow } from "@/lib/auth/guard";

const EXPORT_VERSION = 1;

interface LibraryRow {
  sourceId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[] | null;
  runtimeMinutes: number | null;
  originalLanguage: string | null;
  isFavorite: boolean;
  addedAt: Date | null;
}

interface WishlistRow {
  sourceId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[] | null;
  originalLanguage: string | null;
  addedAt: Date | null;
}

export interface PlaydExport {
  version: number;
  exportedAt: string;
  movies: LibraryRow[];
  tv: LibraryRow[];
  games: LibraryRow[];
  moviesWishlist: WishlistRow[];
  tvWishlist: WishlistRow[];
  gamesWishlist: WishlistRow[];
}

function stripLibraryRow(row: typeof movies.$inferSelect): LibraryRow {
  return {
    sourceId: row.sourceId,
    title: row.title,
    year: row.year,
    posterUrl: row.posterUrl,
    backdropUrl: row.backdropUrl,
    genres: row.genres,
    runtimeMinutes: row.runtimeMinutes,
    originalLanguage: row.originalLanguage,
    isFavorite: row.isFavorite,
    addedAt: row.addedAt,
  };
}

function stripWishlistRow(row: typeof moviesWishlist.$inferSelect): WishlistRow {
  return {
    sourceId: row.sourceId,
    title: row.title,
    year: row.year,
    posterUrl: row.posterUrl,
    genres: row.genres,
    originalLanguage: row.originalLanguage,
    addedAt: row.addedAt,
  };
}

export async function exportUserData(): Promise<PlaydExport> {
  const user = await requireAllowedUserOrThrow();

  const [moviesRows, tvRows, gamesRows, moviesWlRows, tvWlRows, gamesWlRows] =
    await Promise.all([
      db.select().from(movies).where(eq(movies.userId, user.id)),
      db.select().from(tvShows).where(eq(tvShows.userId, user.id)),
      db.select().from(games).where(eq(games.userId, user.id)),
      db.select().from(moviesWishlist).where(eq(moviesWishlist.userId, user.id)),
      db.select().from(tvShowsWishlist).where(eq(tvShowsWishlist.userId, user.id)),
      db.select().from(gamesWishlist).where(eq(gamesWishlist.userId, user.id)),
    ]);

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    movies: moviesRows.map(stripLibraryRow),
    tv: tvRows.map(stripLibraryRow),
    games: gamesRows.map(stripLibraryRow),
    moviesWishlist: moviesWlRows.map(stripWishlistRow),
    tvWishlist: tvWlRows.map(stripWishlistRow),
    gamesWishlist: gamesWlRows.map(stripWishlistRow),
  };
}

function isLibraryRow(value: unknown): value is LibraryRow {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LibraryRow).sourceId === "number" &&
    typeof (value as LibraryRow).title === "string"
  );
}

function isWishlistRow(value: unknown): value is WishlistRow {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as WishlistRow).sourceId === "number" &&
    typeof (value as WishlistRow).title === "string"
  );
}

async function importLibraryTable(
  table: typeof movies | typeof tvShows | typeof games,
  rows: unknown,
  userId: string,
): Promise<number> {
  if (!Array.isArray(rows)) return 0;
  const valid = rows.filter(isLibraryRow);
  if (valid.length === 0) return 0;

  const inserted = await db
    .insert(table)
    .values(
      valid.map((row) => ({
        userId,
        sourceId: row.sourceId,
        title: row.title,
        year: row.year,
        posterUrl: row.posterUrl,
        backdropUrl: row.backdropUrl,
        genres: row.genres,
        runtimeMinutes: row.runtimeMinutes,
        originalLanguage: row.originalLanguage,
        isFavorite: row.isFavorite,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: table.id });

  return inserted.length;
}

async function importWishlistTable(
  table: typeof moviesWishlist | typeof tvShowsWishlist | typeof gamesWishlist,
  rows: unknown,
  userId: string,
): Promise<number> {
  if (!Array.isArray(rows)) return 0;
  const valid = rows.filter(isWishlistRow);
  if (valid.length === 0) return 0;

  const inserted = await db
    .insert(table)
    .values(
      valid.map((row) => ({
        userId,
        sourceId: row.sourceId,
        title: row.title,
        year: row.year,
        posterUrl: row.posterUrl,
        genres: row.genres,
        originalLanguage: row.originalLanguage,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: table.id });

  return inserted.length;
}

export interface ImportResult {
  moviesAdded: number;
  tvAdded: number;
  gamesAdded: number;
  moviesWishlistAdded: number;
  tvWishlistAdded: number;
  gamesWishlistAdded: number;
}

export async function importUserData(data: unknown): Promise<ImportResult> {
  const user = await requireAllowedUserOrThrow();

  if (typeof data !== "object" || data === null) {
    throw new Error("That file doesn't look like a Playd export.");
  }
  const d = data as Partial<PlaydExport>;

  const [
    moviesAdded,
    tvAdded,
    gamesAdded,
    moviesWishlistAdded,
    tvWishlistAdded,
    gamesWishlistAdded,
  ] = await Promise.all([
    importLibraryTable(movies, d.movies, user.id),
    importLibraryTable(tvShows, d.tv, user.id),
    importLibraryTable(games, d.games, user.id),
    importWishlistTable(moviesWishlist, d.moviesWishlist, user.id),
    importWishlistTable(tvShowsWishlist, d.tvWishlist, user.id),
    importWishlistTable(gamesWishlist, d.gamesWishlist, user.id),
  ]);

  return {
    moviesAdded,
    tvAdded,
    gamesAdded,
    moviesWishlistAdded,
    tvWishlistAdded,
    gamesWishlistAdded,
  };
}
