CREATE TABLE "wishlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"media_type" "media_type" NOT NULL,
	"source_id" integer NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"poster_url" text,
	"added_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "wishlist_user_media_source_unique" UNIQUE("user_id","media_type","source_id")
);
