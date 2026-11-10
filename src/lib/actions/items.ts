"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { movies, tvShows, games } from "@/db/schema";
import { requireAllowedUserOrThrow } from "@/lib/auth/guard";
import type { MediaType } from "@/lib/normalize";
import { fetchTitleDetails } from "@/lib/fetch-details";
import { getWishlistSourceIds } from "@/lib/actions/wishlist";

// Each media type lives in its own table (movies / tv_shows / games) rather
// than one shared table with a media_type column — dispatch to the right
// one per call instead of parameterizing a single query.
function libraryTable(mediaType: MediaType) {
  switch (mediaType) {
    case "movie":
      return movies;
    case "tv":
      return tvShows;
    case "game":
      return games;
  }
}

export async function addItem(
  mediaType: MediaType,
  sourceId: number,
): Promise<{ id: number } | null> {
  const user = await requireAllowedUserOrThrow();
  const details = await fetchTitleDetails(mediaType, sourceId);
  const table = libraryTable(mediaType);

  const [inserted] = await db
    .insert(table)
    .values({
      userId: user.id,
      sourceId: details.sourceId,
      title: details.title,
      year: details.year,
      posterUrl: details.posterUrl,
      backdropUrl: details.backdropUrl,
      genres: details.genres,
      runtimeMinutes: details.runtimeMinutes,
      originalLanguage: details.originalLanguage,
    })
    .onConflictDoNothing()
    .returning({ id: table.id });

  return inserted ?? null;
}

/** What Undo needs to put a removed title back exactly as it was. */
export interface RemovedItem {
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

export async function removeItem(
  mediaType: MediaType,
  id: number,
): Promise<RemovedItem | null> {
  const user = await requireAllowedUserOrThrow();
  const table = libraryTable(mediaType);

  const [removed] = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.userId, user.id)))
    .returning({
      sourceId: table.sourceId,
      title: table.title,
      year: table.year,
      posterUrl: table.posterUrl,
      backdropUrl: table.backdropUrl,
      genres: table.genres,
      runtimeMinutes: table.runtimeMinutes,
      originalLanguage: table.originalLanguage,
      isFavorite: table.isFavorite,
      addedAt: table.addedAt,
    });

  return removed ?? null;
}

/**
 * Undo for removeItem: re-insert the snapshot it returned, keeping the
 * original added date and Hall of Fame flag so stats don't shift.
 */
export async function restoreItem(mediaType: MediaType, item: RemovedItem) {
  const user = await requireAllowedUserOrThrow();
  const table = libraryTable(mediaType);
  if (!Number.isInteger(item.sourceId) || item.sourceId <= 0) {
    throw new Error("Invalid item");
  }

  await db
    .insert(table)
    .values({
      userId: user.id,
      sourceId: item.sourceId,
      title: String(item.title).slice(0, 500),
      year: item.year,
      posterUrl: item.posterUrl,
      backdropUrl: item.backdropUrl,
      genres: item.genres,
      runtimeMinutes: item.runtimeMinutes,
      originalLanguage: item.originalLanguage,
      isFavorite: Boolean(item.isFavorite),
      addedAt: item.addedAt ? new Date(item.addedAt) : new Date(),
    })
    .onConflictDoNothing();
}

export async function setFavorite(mediaType: MediaType, id: number, isFavorite: boolean) {
  const user = await requireAllowedUserOrThrow();
  const table = libraryTable(mediaType);

  await db
    .update(table)
    .set({ isFavorite })
    .where(and(eq(table.id, id), eq(table.userId, user.id)));
}

export async function getLibrary(mediaType: MediaType) {
  const user = await requireAllowedUserOrThrow();
  const table = libraryTable(mediaType);

  return db
    .select()
    .from(table)
    .where(eq(table.userId, user.id))
    .orderBy(desc(table.addedAt));
}

export async function getFavorites(mediaType: MediaType) {
  const user = await requireAllowedUserOrThrow();
  const table = libraryTable(mediaType);

  return db
    .select()
    .from(table)
    .where(and(eq(table.userId, user.id), eq(table.isFavorite, true)))
    .orderBy(desc(table.addedAt));
}

export async function getLibrarySourceIds(mediaType: MediaType) {
  const user = await requireAllowedUserOrThrow();
  const table = libraryTable(mediaType);

  const rows = await db
    .select({ sourceId: table.sourceId })
    .from(table)
    .where(eq(table.userId, user.id));

  return rows.map((r) => r.sourceId);
}

export async function getLibraryLanguageCounts(mediaType: MediaType) {
  const user = await requireAllowedUserOrThrow();
  const table = libraryTable(mediaType);

  const rows = await db
    .select({ language: table.originalLanguage })
    .from(table)
    .where(eq(table.userId, user.id));

  const counts: Record<string, number> = {};
  for (const row of rows) {
    const lang = row.language ?? "unknown";
    counts[lang] = (counts[lang] ?? 0) + 1;
  }
  return counts;
}

export async function getDiscoveryContext(mediaType: MediaType) {
  const [library, wishlisted, languageCounts] = await Promise.all([
    getLibrarySourceIds(mediaType),
    getWishlistSourceIds(mediaType),
    getLibraryLanguageCounts(mediaType),
  ]);
  return { library, wishlisted, languageCounts };
}
