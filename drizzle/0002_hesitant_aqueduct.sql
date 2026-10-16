CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"poster_url" text,
	"backdrop_url" text,
	"genres" text[],
	"runtime_minutes" integer,
	"original_language" text,
	"added_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "games_user_source_unique" UNIQUE("user_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "games_wishlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"poster_url" text,
	"added_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "games_wishlist_user_source_unique" UNIQUE("user_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"poster_url" text,
	"backdrop_url" text,
	"genres" text[],
	"runtime_minutes" integer,
	"original_language" text,
	"added_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "movies_user_source_unique" UNIQUE("user_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "movies_wishlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"poster_url" text,
	"added_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "movies_wishlist_user_source_unique" UNIQUE("user_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "tv_shows" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"poster_url" text,
	"backdrop_url" text,
	"genres" text[],
	"runtime_minutes" integer,
	"original_language" text,
	"added_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tv_shows_user_source_unique" UNIQUE("user_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "tv_shows_wishlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"poster_url" text,
	"added_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tv_shows_wishlist_user_source_unique" UNIQUE("user_id","source_id")
);
