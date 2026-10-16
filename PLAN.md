# Playd build plan

Each phase ends in something I can run. Stop after each phase for review.

## Phase 0: Accounts and keys (manual, done by me)

- [ ] Neon project "Playd" created (Postgres + Neon Auth, Singapore)
- [ ] TMDB account, API Read Access Token (Settings > API)
- [ ] Twitch developer app for IGDB (dev.twitch.tv/console), Client ID + Client Secret
- [ ] GitHub repo `playd`
- [ ] Vercel account linked to GitHub

### Environment variables (`.env.local`, never committed)

```
DATABASE_URL=            # Neon pooled connection string
TMDB_READ_TOKEN=         # TMDB API Read Access Token (v4 bearer)
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
ALLOWED_EMAIL=           # the only account allowed to use the app
# + whatever Neon Auth requires (check its docs)
```

## Phase 1: Scaffold

- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Theme tokens from CLAUDE.md, Inter font, dark only
- Layout shell: top nav (desktop), bottom tab bar (mobile), empty Home / Movies / TV / Games pages, TMDB attribution footer
- `vercel.json` with `"regions": ["sin1"]`

**Done when:** app runs locally and the nav switches between empty pages on desktop and mobile widths.

## Phase 2: Database

Drizzle schema + migrations:

```
media_type enum: 'movie' | 'tv' | 'game'

items
  id               serial pk
  user_id          text not null
  media_type       media_type not null
  source_id        integer not null      -- TMDB id or IGDB id
  title            text not null
  year             integer
  poster_url       text
  backdrop_url     text
  genres           text[]
  runtime_minutes  integer               -- movie runtime, or tv episodes x avg episode runtime; null for games
  original_language text
  added_at         timestamptz default now()
  unique (user_id, media_type, source_id)

skips
  user_id      text not null
  media_type   media_type not null
  source_id    integer not null
  skipped_at   timestamptz default now()
  primary key (user_id, media_type, source_id)
```

**Done when:** migrations run against Neon and tables exist.

## Phase 3: Auth

- Neon Auth sign-in
- Middleware: redirect signed-out users to sign-in
- Every server action and route handler checks the session email equals `ALLOWED_EMAIL`, else 403
- After my account exists, disable public sign-up if Neon Auth allows it

**Done when:** I can sign in, and a different account is blocked.

## Phase 4: Data layer

Server-only modules:

- `lib/tmdb.ts`: discover (movie, tv, with language + popularity filters), recommendations, search, details (for runtime / episode count / genres)
- `lib/igdb.ts`: Twitch token fetch + cache, popular games, similar games, search, cover URL builder
- Normalize both into one shape: `{ mediaType, sourceId, title, year, posterUrl, backdropUrl, genres, runtimeMinutes, originalLanguage }`

Server actions:
- `addItem(mediaType, sourceId)`: fetch details, insert into `items`
- `removeItem(id)`
- `skipItems(mediaType, sourceIds[])`
- `getLibrary(mediaType)`

**Done when:** I can add, remove and list items through a test page.

## Phase 5: Library tabs, discovery popup, search

- Library grid per tab (poster cards, hover zoom)
- Right-click context menu + long-press on touch with "Remove"
- Discovery popup (shadcn Dialog, full-screen on mobile):
  - Initial popular batch
  - Click: add + Undo toast + inject recommendations into queue
  - 70/30 similar/fresh mix
  - Filter out library, skips, already shown
  - "Show more" button: records unclicked visible titles as skips, loads next batch
  - Opens automatically on tab open, and via a button
- Search: debounced input, all languages, same click-to-add grid, checkmark on titles already in library

**Done when:** I can bulk-add 50 movies in a few minutes through the popup and find a non-English title through search.

## Phase 6: Home dashboard

- Hero: most recently added title's backdrop, with total counts overlaid
- Stat tiles: movies, series, games, total hours watched (movies + TV)
- Top genres per type
- Titles by decade
- Rows: "Recently added" per type (horizontal scroll)
- All computed from the `items` table, no live API calls

**Done when:** the dashboard reflects my library accurately.

## Phase 7: Deploy

- Push to GitHub, import into Vercel, add env vars, confirm `sin1` region
- Smoke test on phone and desktop

**Done when:** I can log a title from my phone on the live URL.
