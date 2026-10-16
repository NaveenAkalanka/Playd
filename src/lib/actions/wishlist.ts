"use server";

import { and, desc, eq } from "drizzle-orm";
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
import type { MediaType } from "@/lib/normalize";
import { fetchTitleDetails } from "@/lib/fetch-details";

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

export async function addToWishlist(
  mediaType: MediaType,
  sourceId: number,
): Promise<{ id: number } | null> {
  const user = await requireAllowedUserOrThrow();
  const details = await fetchTitleDetails(mediaType, sourceId);
  const table = wishlistTable(mediaType);

  const [inserted] = await db
    .insert(table)
    .values({
      userId: user.id,
      sourceId: details.sourceId,
      title: details.title,
      year: details.year,
      posterUrl: details.posterUrl,
      genres: details.genres,
      originalLanguage: details.originalLanguage,
    })
    .onConflictDoNothing()
    .returning({ id: table.id });

  return inserted ?? null;
}

export async function removeFromWishlist(mediaType: MediaType, id: number) {
  const user = await requireAllowedUserOrThrow();
  const table = wishlistTable(mediaType);

  await db.delete(table).where(and(eq(table.id, id), eq(table.userId, user.id)));
}

export async function moveToWishlist(
  mediaType: MediaType,
  id: number,
): Promise<{ id: number } | null> {
  const user = await requireAllowedUserOrThrow();
  const libTable = libraryTable(mediaType);
  const wlTable = wishlistTable(mediaType);

  const [row] = await db
    .select()
    .from(libTable)
    .where(and(eq(libTable.id, id), eq(libTable.userId, user.id)));
  if (!row) return null;

  const [inserted] = await db
    .insert(wlTable)
    .values({
      userId: user.id,
      sourceId: row.sourceId,
      title: row.title,
      year: row.year,
      posterUrl: row.posterUrl,
      genres: row.genres,
      originalLanguage: row.originalLanguage,
    })
    .onConflictDoNothing()
    .returning({ id: wlTable.id });

  await db.delete(libTable).where(and(eq(libTable.id, id), eq(libTable.userId, user.id)));

  return inserted ?? null;
}

export async function markWishlistItemWatched(
  mediaType: MediaType,
  id: number,
  sourceId: number,
): Promise<{ id: number } | null> {
  const user = await requireAllowedUserOrThrow();
  const details = await fetchTitleDetails(mediaType, sourceId);
  const libTable = libraryTable(mediaType);
  const wlTable = wishlistTable(mediaType);

  const [inserted] = await db
    .insert(libTable)
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
    .returning({ id: libTable.id });

  await db.delete(wlTable).where(and(eq(wlTable.id, id), eq(wlTable.userId, user.id)));

  return inserted ?? null;
}

export async function getWishlist(mediaType: MediaType) {
  const user = await requireAllowedUserOrThrow();
  const table = wishlistTable(mediaType);

  const rows = await db
    .select()
    .from(table)
    .where(eq(table.userId, user.id))
    .orderBy(desc(table.addedAt));

  // mediaType is which table we queried, not a column on it — attach it
  // back on so callers that mix items from multiple tables (the wishlist
  // grid, search) know what they're looking at.
  return rows.map((row) => ({ ...row, mediaType }));
}

export async function getWishlistSourceIds(mediaType: MediaType) {
  const user = await requireAllowedUserOrThrow();
  const table = wishlistTable(mediaType);

  const rows = await db
    .select({ sourceId: table.sourceId })
    .from(table)
    .where(eq(table.userId, user.id));

  return rows.map((r) => r.sourceId);
}
