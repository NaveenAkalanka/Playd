<div align="center">
  <img src="public/logo.svg" alt="Playd" width="320" />

  <p>A personal, single-user log of every movie, TV series and game I've watched or played.</p>
</div>

---

## Why I built this

I'd already watched or played hundreds of titles by the time I thought about tracking any of it, so a normal "add a title" form was a non-starter — typing in hundreds of entries one at a time is exactly the kind of friction that makes you give up on day one. Playd exists to solve that one problem: a **click-to-recognize discovery popup** shows posters of popular and recommended titles, and recognizing something and clicking it is the entire interaction. No ratings, no watch dates, no episode tracking, no notes — just "I've seen this." That constraint is deliberate; see [Product rules](#product-rules) below.

## Features

- **Discovery popup** — posters to click through, pulling in TMDB/IGDB recommendations as you go, mixed with fresh popular titles so it doesn't spiral into one genre.
- **Movies / TV / Games** — a library tab per type: poster grid (S/M/L sizes) or compact list, with genre/year/language filters and sort.
- **Search** — same click-to-add grid across all languages, locked to a type when opened from a library tab.
- **Wishlist** — saved titles you haven't watched yet, separate from the library.
- **Hall of Fame** — a plain yes/no favorite marker on titles you've already logged. Not a rating scale.
- **Home dashboard** — counts, hours watched/played, top genres, titles by decade, recently added, all computed from cached data (no live API calls).
- **Account page** — change your name/password, forgot-password recovery, and export/import your whole library as JSON.
- Single-user by design — sign-up is locked to one email (`ALLOWED_EMAIL`); anyone else gets a 403.

## Product rules

- An entry means "seen it / played it." Nothing else — no ratings, no watch dates, no progress, no notes.
- Clicking a TV series means you watched all of it. No season/episode tracking.
- Click a poster → add it immediately (5s Undo toast). Right-click / long-press → add to wishlist instead.
- Titles already in your library or wishlist never show up again in discovery or search.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) + TypeScript |
| Styling | Tailwind CSS + [shadcn/ui](https://ui.shadcn.com) (Radix primitives) |
| Database | [Neon](https://neon.tech) Postgres, region ap-southeast-1 (Singapore) |
| ORM | [Drizzle](https://orm.drizzle.team) (`@neondatabase/serverless` HTTP driver) |
| Auth | [Neon Auth](https://neon.tech/docs/guides/neon-auth) (hosted Better Auth) |
| Movie/TV data | [TMDB API](https://www.themoviedb.org/documentation/api) |
| Game data | [IGDB API](https://api-docs.igdb.com) via Twitch developer credentials |
| Hosting | [Netlify](https://www.netlify.com) |

## Setup

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) project with **Neon Auth** enabled
- A [TMDB](https://www.themoviedb.org) account → Settings → API → API Read Access Token (v4)
- A [Twitch developer app](https://dev.twitch.tv/console) (for IGDB) → Client ID + Client Secret

### Install

```bash
git clone https://github.com/NaveenAkalanka/Playd.git
cd Playd
npm install
```

### Configure

```bash
cp .env.example .env.local
```

Fill in `.env.local` — see [`.env.example`](./.env.example) for where each value comes from. In short:

| Variable | Purpose |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Neon Postgres connection strings |
| `NEON_BRANCH` | Neon branch name the app targets (usually `production`) |
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` | From the Auth tab of your Neon project |
| `NEON_AUTH_COOKIE_SECRET` | Any random 32+ character string, for signing session cookies |
| `ALLOWED_EMAIL` | The one email allowed to use the app |
| `TMDB_READ_TOKEN` | TMDB API Read Access Token |
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | Twitch app credentials (IGDB auth) |

### Set up the database

```bash
npm run db:migrate
```

This applies the migrations in `drizzle/` to your Neon branch. (`npm run db:generate` creates a new migration after a schema change in `src/db/schema.ts`; `npm run db:studio` opens Drizzle Studio against your database.)

### Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up with `ALLOWED_EMAIL` (sign-up is rejected for any other address), and start clicking posters.

## Usage guide

1. **Sign up / sign in** with the email set in `ALLOWED_EMAIL`.
2. The **Discovery popup** opens automatically the first time you open a Movies/TV/Games tab, and again after an hour idle (or via the Discover button). Click a poster you've seen — it's added instantly, with a 5-second Undo toast, and its recommendations get mixed into the rest of the popup. Right-click (or long-press on touch) to add to your wishlist instead.
3. Keep clicking "Show more" to churn through titles — nothing is permanently skipped, so anything you pass on can resurface on a later visit.
4. Use **Search** to find something that didn't come up in discovery — opening it from a Movies/TV/Games tab locks it to that type; opening it from Home searches everything.
5. **Wishlist** and **Hall of Fame** each have their own Movies/TV/Games sub-tabs. In the Wishlist, click a title to copy its name to the clipboard; right-click for "Mark as watched," "View more info," or "Remove." In the library, right-click for "Add/Remove from Hall of Fame," "Move to wishlist," "View more info," or "Remove."
6. **Account** (icon in the top nav) — update your name or password, recover a forgotten password, or export/import your whole library as a JSON file.

## Deployment

This project is deployed on **Netlify**, connected directly to this GitHub repo (push to `main` → auto-deploy). To deploy your own copy:

1. Push the repo to GitHub and connect it to a new Netlify site.
2. Add every variable from [`.env.example`](./.env.example) under Netlify **Site configuration → Environment variables**.
3. Netlify's build-output secrets scanner will flag Next.js's build cache (which stores raw env values for cache invalidation) as a false positive. Add two more environment variables to silence it:
   - `SECRETS_SCAN_OMIT_PATHS` = `.netlify/.next/cache/**,.next/cache/**`
   - `SECRETS_SCAN_OMIT_KEYS` = `NEON_BRANCH,SECRETS_SCAN_OMIT_KEYS,SECRETS_SCAN_OMIT_PATHS` (`NEON_BRANCH`'s value, `production`, coincidentally matches text throughout framework source; the other two keys exempt their own values from being scanned for too — once they're configured, the scanner treats their literal values as secrets as well, and this README documenting those exact values is enough to trip it otherwise)
4. Deploy. Once you have your Netlify URL, register it as a **trusted domain** in your Neon project's Auth settings (Neon console → your project → Auth → Trusted domains) — Neon Auth only allows sign-in to complete for origins on that list, and without it you'll sign in and immediately get bounced back to the sign-in page with no visible error.
5. Optional: Netlify shows a "Powered by Netlify" badge on new free-tier sites. Turn it off under **Project configuration → General → Powered by Netlify badge**, if you'd rather not have it.

Steps 3 and 4 both came from real deploy failures hit while building this — Netlify's secrets scanner flags the Next.js build cache as a false positive (fixed with those two env vars, no code change), and Neon Auth only completes sign-in for origins on its trusted-domains allowlist (fixed by registering the deployed URL there).

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. Game data from IGDB, via Twitch developer credentials.
