# Playd

Personal web app for logging every movie, TV series and game I have watched or played. One user (me). Mobile and desktop.

The core problem: I have already watched and played hundreds of titles, so typing them in one by one is not an option. Playd solves this with a **click-to-recognize discovery popup**: it shows posters, I click the ones I have seen, each click adds the title and pulls in similar titles.

## Product rules (do not drift from these)

- An entry means "seen it / played it". Nothing else. **No ratings, no watch dates, no progress, no notes, no statuses** — with one deliberate exception: a plain yes/no "Hall of Fame" favorite marker (see Screens). Still no scale, no numeric rating, no notes.
- Clicking a TV series means I watched all of it. No season or episode tracking.
- `added_at` is stored automatically for "added this month" style stats. It is never shown as a watch date and never edited by the user.
- Keep the UI minimal. If a feature needs a form, it probably does not belong.

## Screens

1. **Home**: dashboard with overall stats (see PLAN.md, Phase 6).
2. **Movies / TV / Games tabs**: each shows my library for that type as a poster grid. A size/list view toggle (S/M/L card sizes, or a compact list) is remembered across visits. A filter/sort bar (genre, year, language, sort by recently-added/title/year) narrows and orders the grid.
3. **Discovery popup**: opens automatically the first time a tab is opened, and again after an hour of inactivity (and via a button). Closing it reveals the library.
4. **Search**: same click-to-add grid as the popup, searching all languages. Opening it from a Movies/TV/Games tab locks it to that type (with its own genre/year filters and a popular-titles view before you type anything); opening it from Home searches all three types with no lock or filters. Infinite-scroll pagination either way. A close button returns to where you came from.
5. **Wishlist**: its own top-level section with separate Movies/TV/Games sub-tabs (never all three mixed on one page) for titles saved via "Add to wishlist" without marking them watched. Same view toggle and filter/sort bar as the library tabs.
6. **Hall of Fame**: its own top-level section, same separate Movies/TV/Games sub-tab structure as Wishlist. Shows titles marked as a favorite from a library tab. Same view toggle and filter/sort bar.

## Interaction rules

- Click a poster in popup or search: add to library immediately, show a 5 second **Undo** toast. No confirm step, no checkmark — the poster just disappears (in the popup it's replaced by another suggestion so the grid stays full).
- Right-click (desktop) / long-press (~500 ms, touch) a poster in the popup or search: **Add to wishlist** instead, without marking it watched.
- Right-click / long-press a poster in a library tab: **Add/Remove from Hall of Fame**, **Move to wishlist**, or **Remove**.
- Right-click / long-press a poster in the Hall of Fame: **Remove from Hall of Fame** (does not remove the underlying watched/played entry).
- Right-click / long-press a poster in the Wishlist: **Mark as watched** or **Remove**.
- Titles already in the library or wishlist are excluded from the popup and from search results — never shown twice.
- Nothing is permanently skipped: "Show more" just loads a new batch (titles you passed on can show up again on a later visit).

## Discovery popup logic

- **Initial batch**: popular and well-known titles so the first screen gets hits.
  - Movies/TV: TMDB discover, `with_original_language=en|ko`, `sort_by=popularity.desc` (and mix in `vote_count.desc`), minimum vote count to avoid obscure titles.
  - Games: IGDB, sorted by rating count / popularity.
- **On click**: fetch recommendations for that title (TMDB `/movie/{id}/recommendations`, `/tv/{id}/recommendations`; IGDB `similar_games`) and insert them into the upcoming queue.
- **Mix**: roughly 70% similar / 30% fresh popular, so clicking ten Marvel films does not turn the popup into all Marvel.
- **Always filter out**: titles in library, titles in wishlist, titles already shown this session.
- **Random start**: each time the popup opens, the initial batch starts from a random page of the discover feed instead of always page 1, so repeat opens don't show the same titles every time.
- **Language filter**: popup shows English and Korean only for Movies/TV. Search has no language filter.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Neon Postgres, region AWS ap-southeast-1 (Singapore) |
| ORM | Drizzle (Neon serverless driver) |
| Auth | Neon Auth |
| Movie/TV data | TMDB API |
| Game data | IGDB API (Twitch developer credentials) |
| Hosting | Vercel, function region `sin1` |

Rules:
- All TMDB and IGDB calls go through server code (route handlers / server actions). API keys never reach the browser. IGDB also blocks browser calls (no CORS).
- Check current Neon Auth docs before wiring auth; do not rely on memory for its SDK.
- **Lock access to me**: after auth, check the signed-in email against `ALLOWED_EMAIL` on every server action and in the `(app)` layout (`src/lib/auth/guard.ts`) — not actually in `proxy.ts` (that only checks a session exists, via Neon Auth's own `auth.middleware()`; it has no email check, so don't assume it does). Anyone else gets a 403, even if they manage to sign up.
- Cache title metadata (title, year, poster, genres, runtime) in the database when adding, so the library and dashboard never need live API calls.
- Respect IGDB's rate limit (4 requests/second). Cache the Twitch access token until it expires.
- TMDB attribution is required: footer text "This product uses the TMDB API but is not endorsed or certified by TMDB." plus the TMDB logo.
- **Rate limiting**: an in-memory sliding-window limiter (`src/lib/rate-limit.ts`) runs inside the auth guard (covers every protected page/action, 300 req/min/IP) and inside `/api/auth/[...path]` (20 req/min/IP, since that's the actual credential-processing endpoint). It only works from regular server-action/route-handler code — empirically, `proxy.ts`'s module state does not reliably persist across requests here, so don't try to rate-limit there. It resets on cold start and isn't shared across instances/regions (no Upstash/Redis — deliberate, for a low-traffic personal app).
- Security headers (`next.config.ts`'s `headers()`): X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS. No CSP yet — adding one needs to be tested live (a wrong one can silently break Neon Auth's session calls or Next's hydration).

## Theme

Dark only. Streaming-app layout (poster-driven, horizontal rows on home, hover-zoom cards, full-screen modal). Do **not** copy Netflix branding: no Netflix logo, wordmark, font or exact red.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b0b0c` | Page background |
| `--surface` | `#151517` | Cards, nav, modal |
| `--surface-2` | `#1f1f22` | Hover, inputs |
| `--border` | `#2a2a2e` | Dividers |
| `--text` | `#ededed` | Primary text |
| `--text-muted` | `#9a9aa0` | Secondary text |
| `--accent` | `#d7263d` | Crimson: buttons, active tab, links |
| `--accent-hover` | `#b81f33` | Accent hover |

- Font: Inter. Bold display weight for logo and hero titles.
- Posters: 2:3 ratio, rounded 6px, subtle scale (1.05) on hover with shadow.
- Desktop: top nav (logo, Home, Movies, TV, Games, Wishlist, Hall of Fame, search icon, profile).
- Mobile: bottom tab bar, popup becomes full-screen, grids 3 columns.

## Working style

- Build in the phases in PLAN.md. Stop after each phase so I can run it and review.
- Explain the approach briefly before a phase, then do it.
- Do not add features outside this file without asking.
- Never commit secrets. `.env.local` stays in `.gitignore`.
