ALTER TABLE "games" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games_wishlist" ADD COLUMN "genres" text[];--> statement-breakpoint
ALTER TABLE "games_wishlist" ADD COLUMN "original_language" text;--> statement-breakpoint
ALTER TABLE "movies" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "movies_wishlist" ADD COLUMN "genres" text[];--> statement-breakpoint
ALTER TABLE "movies_wishlist" ADD COLUMN "original_language" text;--> statement-breakpoint
ALTER TABLE "tv_shows" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tv_shows_wishlist" ADD COLUMN "genres" text[];--> statement-breakpoint
ALTER TABLE "tv_shows_wishlist" ADD COLUMN "original_language" text;