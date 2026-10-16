import { pgTable, serial, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";

function libraryColumns() {
  return {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    sourceId: integer("source_id").notNull(),
    title: text("title").notNull(),
    year: integer("year"),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    genres: text("genres").array(),
    runtimeMinutes: integer("runtime_minutes"),
    originalLanguage: text("original_language"),
    // Hall of Fame: a plain yes/no marker on an already-watched/played title,
    // not a rating scale — CLAUDE.md still bans ratings/statuses otherwise.
    isFavorite: boolean("is_favorite").notNull().default(false),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  };
}

export const movies = pgTable("movies", libraryColumns(), (table) => [
  unique("movies_user_source_unique").on(table.userId, table.sourceId),
]);

export const tvShows = pgTable("tv_shows", libraryColumns(), (table) => [
  unique("tv_shows_user_source_unique").on(table.userId, table.sourceId),
]);

export const games = pgTable("games", libraryColumns(), (table) => [
  unique("games_user_source_unique").on(table.userId, table.sourceId),
]);

function wishlistColumns() {
  return {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    sourceId: integer("source_id").notNull(),
    title: text("title").notNull(),
    year: integer("year"),
    posterUrl: text("poster_url"),
    genres: text("genres").array(),
    originalLanguage: text("original_language"),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  };
}

export const moviesWishlist = pgTable("movies_wishlist", wishlistColumns(), (table) => [
  unique("movies_wishlist_user_source_unique").on(table.userId, table.sourceId),
]);

export const tvShowsWishlist = pgTable("tv_shows_wishlist", wishlistColumns(), (table) => [
  unique("tv_shows_wishlist_user_source_unique").on(table.userId, table.sourceId),
]);

export const gamesWishlist = pgTable("games_wishlist", wishlistColumns(), (table) => [
  unique("games_wishlist_user_source_unique").on(table.userId, table.sourceId),
]);
