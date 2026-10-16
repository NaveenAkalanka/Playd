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

export async function removeItem(mediaType: MediaType, id: number) {
  const user = await requireAllowedUserOrThrow();
  const table = libraryTable(mediaType);

  await db.delete(table).where(and(eq(table.id, id), eq(table.userId, user.id)));
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
