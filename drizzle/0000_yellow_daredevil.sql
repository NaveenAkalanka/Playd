CREATE TYPE "public"."media_type" AS ENUM('movie', 'tv', 'game');--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"media_type" "media_type" NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"poster_url" text,
	"backdrop_url" text,
	"genres" text[],
	"runtime_minutes" integer,
	"original_language" text,
	"added_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "items_user_media_source_unique" UNIQUE("user_id","media_type","source_id")
);
--> statement-breakpoint
CREATE TABLE "skips" (
	"user_id" text NOT NULL,
	"media_type" "media_type" NOT NULL,
	"source_id" integer NOT NULL,
	"skipped_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "skips_user_id_media_type_source_id_pk" PRIMARY KEY("user_id","media_type","source_id")
);
