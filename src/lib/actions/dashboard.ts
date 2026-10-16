"use server";

import { desc, eq } from "drizzle-orm";
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

export interface RecentItem {
  id: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
}

export interface BarRow {
  label: string;
  count: number;
}

export interface Section {
  count: number;
  /** Total hours (rounded); null when no runtime data exists. */
  hours: number | null;
  addedThisMonth: number;
  topGenres: BarRow[];
  decades: BarRow[];
  /** Titles added per month, oldest first, for the last 12 months. */
  addedByMonth: BarRow[];
}

export interface TypeSection extends Section {
  recent: RecentItem[];
  wishlistCount: number;
  /** Wishlist titles, newest first. */
  wishlist: RecentItem[];
  /** Top original languages; empty for games. */
  languages: BarRow[];
  avgMinutes: number | null;
  longest: { title: string; minutes: number } | null;
  /** Share of the library released in the last 10 years (0-100); null if no years. */
  recentReleasePct: number | null;
}

export interface Dashboard {
  overall: Section & { wishlistCount: number };
  byType: Record<MediaType, TypeSection>;
}

const RECENT_LIMIT = 20;
const TOP_GENRES = 8;
const TOP_LANGUAGES = 6;

type Row = {
  id: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[] | null;
  runtimeMinutes: number | null;
  originalLanguage: string | null;
  addedAt: Date | null;
};

function hoursOf(rows: Row[]): number | null {
  if (!rows.some((r) => r.runtimeMinutes != null)) return null;
  return Math.round(rows.reduce((s, r) => s + (r.runtimeMinutes ?? 0), 0) / 60);
}

function monthKey(d: Date) {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

function section(rows: Row[], now: Date): Section {
  const genres = new Map<string, number>();
  const decades = new Map<number, number>();
  const byMonth = new Map<number, number>();
  const nowKey = monthKey(now);

  for (const row of rows) {
    for (const g of row.genres ?? []) genres.set(g, (genres.get(g) ?? 0) + 1);
    if (row.year != null) {
      const decade = Math.floor(row.year / 10) * 10;
      decades.set(decade, (decades.get(decade) ?? 0) + 1);
    }
    if (row.addedAt) {
      const k = monthKey(row.addedAt);
      byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
    }
  }

  const addedByMonth: BarRow[] = [];
  for (let k = nowKey - 11; k <= nowKey; k++) {
    const label = new Date(Date.UTC(Math.floor(k / 12), k % 12, 1)).toLocaleString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    addedByMonth.push({ label, count: byMonth.get(k) ?? 0 });
  }

  return {
    count: rows.length,
    hours: hoursOf(rows),
    addedThisMonth: byMonth.get(nowKey) ?? 0,
    topGenres: [...genres.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, TOP_GENRES),
    decades: [...decades.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([decade, count]) => ({ label: `${decade}s`, count })),
    addedByMonth,
  };
}

function typeSection(rows: Row[], wishlist: RecentItem[], now: Date): TypeSection {
  const langs = new Map<string, number>();
  for (const row of rows) {
    if (row.originalLanguage) {
      langs.set(row.originalLanguage, (langs.get(row.originalLanguage) ?? 0) + 1);
    }
  }
  const names = new Intl.DisplayNames(["en"], { type: "language" });
  const languageName = (code: string) => {
    try {
      return names.of(code) ?? code;
    } catch {
      return code;
    }
  };

  const timed = rows.filter((r) => r.runtimeMinutes != null);
  const longestRow = timed.reduce<Row | null>(
    (best, r) => (!best || r.runtimeMinutes! > best.runtimeMinutes! ? r : best),
    null,
  );

  const withYear = rows.filter((r) => r.year != null);
  const cutoff = now.getUTCFullYear() - 10;

  return {
    ...section(rows, now),
    recent: rows.slice(0, RECENT_LIMIT).map(({ id, title, year, posterUrl }) => ({
      id,
      title,
      year,
      posterUrl,
    })),
    wishlistCount: wishlist.length,
    wishlist: wishlist.slice(0, RECENT_LIMIT),
    languages: [...langs.entries()]
      .map(([code, count]) => ({ label: languageName(code), count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, TOP_LANGUAGES),
    avgMinutes: timed.length
      ? Math.round(timed.reduce((s, r) => s + r.runtimeMinutes!, 0) / timed.length)
      : null,
    longest: longestRow
      ? { title: longestRow.title, minutes: longestRow.runtimeMinutes! }
      : null,
    recentReleasePct: withYear.length
      ? Math.round((withYear.filter((r) => r.year! >= cutoff).length / withYear.length) * 100)
      : null,
  };
}

// Everything here comes from the cached columns in our own tables — no
// TMDB/IGDB calls.
export async function getDashboard(): Promise<Dashboard> {
  const user = await requireAllowedUserOrThrow();

  const load = (table: typeof movies | typeof tvShows | typeof games): Promise<Row[]> =>
    db
      .select({
        id: table.id,
        title: table.title,
        year: table.year,
        posterUrl: table.posterUrl,
        genres: table.genres,
        runtimeMinutes: table.runtimeMinutes,
        originalLanguage: table.originalLanguage,
        addedAt: table.addedAt,
      })
      .from(table)
      .where(eq(table.userId, user.id))
      .orderBy(desc(table.addedAt));

  const loadWishlist = (
    table: typeof moviesWishlist | typeof tvShowsWishlist | typeof gamesWishlist,
  ): Promise<RecentItem[]> =>
    db
      .select({
        id: table.id,
        title: table.title,
        year: table.year,
        posterUrl: table.posterUrl,
      })
      .from(table)
      .where(eq(table.userId, user.id))
      .orderBy(desc(table.addedAt));

  const [movieRows, tvRows, gameRows, movieWish, tvWish, gameWish] = await Promise.all([
    load(movies),
    load(tvShows),
    load(games),
    loadWishlist(moviesWishlist),
    loadWishlist(tvShowsWishlist),
    loadWishlist(gamesWishlist),
  ]);

  const now = new Date();

  return {
    overall: {
      ...section([...movieRows, ...tvRows, ...gameRows], now),
      wishlistCount: movieWish.length + tvWish.length + gameWish.length,
    },
    byType: {
      movie: typeSection(movieRows, movieWish, now),
      tv: typeSection(tvRows, tvWish, now),
      game: typeSection(gameRows, gameWish, now),
    },
  };
}
