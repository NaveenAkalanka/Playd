# Playd — full documentation

This is the deep-dive companion to [`README.md`](./README.md): the product rules, the architecture, a full file tour, and — the part a README usually skips — every real issue hit while building and deploying this, and exactly how it got fixed.

## Contents

- [Why this exists](#why-this-exists)
- [Product rules](#product-rules)
- [Screens](#screens)
- [Architecture](#architecture)
  - [Request flow](#request-flow)
  - [Database schema](#database-schema)
  - [Auth & access control](#auth--access-control)
  - [Rate limiting](#rate-limiting)
  - [External APIs](#external-apis)
  - [Caching](#caching)
  - [The discovery popup, in detail](#the-discovery-popup-in-detail)
  - [Progressive rendering](#progressive-rendering)
  - [Security headers](#security-headers)
- [Project structure](#project-structure)
- [Setup, step by step](#setup-step-by-step)
- [Deployment](#deployment)
- [Issues encountered & how they were solved](#issues-encountered--how-they-were-solved)
- [Known limitations](#known-limitations)

## Why this exists

By the time I thought about tracking what I'd watched and played, there were already hundreds of titles behind me — and no list, no spreadsheet, nothing. Any tool that makes you *type in* hundreds of movies, shows and games one at a time was never going to get finished; that kind of setup cost is exactly why these projects die on day one.

So the one problem Playd had to solve was: **recognizing is faster than typing.** The discovery popup shows posters — mostly popular/well-known titles at first, then increasingly titles related to whatever you've already clicked — and you click the ones you've seen. Each click adds it and immediately shows you more related titles. Getting through fifty or a hundred watched movies this way takes minutes, not an evening.

Everything else about the product follows from protecting that core loop from feature creep. No ratings, no watch dates, no review text, no episode-by-episode tracking — every one of those is a tiny bit of friction on the one action (click) that has to stay effortless, and none of them were the actual problem being solved. The one deliberate exception is **Hall of Fame**, a plain yes/no favorite marker — still not a rating scale, just "this one mattered."

It's also deliberately single-user. There's no multi-tenant anything, no sharing, no social layer — it's a personal log, gated to one email address (`ALLOWED_EMAIL`), checked on every single server action and page load.

## Product rules

(Reproduced from the project's internal spec, since the rules below are the actual contract the app is built to — not just a feature list.)

- An entry means "seen it / played it." Nothing else — no ratings, no watch dates, no progress, no notes, no statuses. The one exception is Hall of Fame (plain yes/no favorite).
- Clicking a TV series means you watched all of it. No season or episode tracking.
- `added_at` is stored automatically for "added this month" style stats. It's never shown as a watch date and never user-editable.
- If a feature needs a form, it probably doesn't belong.

## Screens

| Screen | What it does |
|---|---|
| **Home** | Dashboard: overall stats, top genres, titles by decade, recently added, all computed from the database — no live TMDB/IGDB calls. |
| **Movies / TV / Games** | Poster grid (S/M/L) or list view per type, remembered across visits. Genre/year/language filters, sort by recently-added/title/year. |
| **Discovery popup** | Opens automatically the first time a tab is opened each session (and again after an hour idle, or via a button). Click-to-add grid; closing it reveals the library. |
| **Search** | Same click-to-add grid, all languages. Locked to a type when opened from a Movies/TV/Games tab (with its own filters and a popular-titles view before you type); unlocked and all-type from Home. Infinite scroll. |
| **Wishlist** | Separate Movies/TV/Games sub-tabs for titles saved without marking them watched. |
| **Hall of Fame** | Separate Movies/TV/Games sub-tabs for favorited titles. |
| **Account** | Name/password changes, forgot-password, data export/import, sign out. |

### Interaction rules

- **Click** a poster in the popup or search → added immediately, 5-second Undo toast, no confirm step. In the popup, the poster is replaced by another suggestion so the grid stays full.
- **Right-click (desktop) / long-press ~500ms (touch)** a poster in the popup or search → **Add to wishlist** instead.
- **Right-click / long-press** a poster in a library tab → Add/Remove Hall of Fame, Move to wishlist, View more info, or Remove.
- **Click** a poster/row in the Wishlist → copies the title to the clipboard (useful for pasting into a quick search elsewhere). **Right-click / long-press** → Mark as watched, View more info, or Remove.
- **Right-click / long-press** in Hall of Fame → View more info or Remove from Hall of Fame (the underlying watched/played entry stays).
- Titles already in the library or wishlist are excluded from the popup and search — never shown twice.
- Nothing is permanently skipped. "Show more" loads a new batch; passed-over titles can resurface on a later visit.

## Architecture

### Request flow

Almost everything is a Next.js **Server Action** — there is no conventional REST API for app data. The only two real HTTP route handlers are `src/app/api/auth/[...path]/route.ts` (proxies to Neon Auth) and `src/app/api/backfill-game-playtime/route.ts` (a one-off, auth-guarded migration endpoint used once to backfill `runtime_minutes` for games added before that field existed).

```
Client component → Server Action (src/lib/actions/*.ts) → Drizzle → Neon Postgres
                                 ↘ (on add) → TMDB/IGDB for details, cached into the row
```

`proxy.ts` is this project's Next.js middleware (Next 16 renamed `middleware.ts` → `proxy.ts`). It only does one thing: run Neon Auth's own `auth.middleware()`, which checks a session exists and redirects to `/auth/sign-in` if not. It does **not** check which email is signed in — that's the job of the guard functions below, and that distinction matters (see [Issues](#issues-encountered--how-they-were-solved)).

### Database schema

Neon Postgres, Drizzle ORM, migrations in `drizzle/`. Each media type gets its own table rather than one shared table with a `media_type` column:

```
movies, tv_shows, games                — the library (things you've watched/played)
  id, user_id, source_id, title, year, poster_url, backdrop_url,
  genres[], runtime_minutes, original_language, is_favorite, added_at
  unique(user_id, source_id)

movies_wishlist, tv_shows_wishlist, games_wishlist
  id, user_id, source_id, title, year, poster_url,
  genres[], original_language, added_at
  unique(user_id, source_id)
```

- `source_id` is the TMDB id for movies/TV, the IGDB id for games.
- `is_favorite` is the entire Hall of Fame feature — a boolean column, toggled by a server action, no separate table.
- The `unique(user_id, source_id)` constraint is what makes every insert idempotent: adding something already in your library is a silent no-op (`onConflictDoNothing()`), which the discovery popup and import flow both lean on instead of checking "does this exist?" before every insert.
- The Neon driver in use (`@neondatabase/serverless`, HTTP mode — see `src/db/index.ts`) does **not** support transactions, so multi-table writes (e.g. moving an item from the library to the wishlist) are done as separate sequential statements. This is an accepted tradeoff for a low-traffic personal app, not an oversight.

### Auth & access control

Auth is [Neon Auth](https://neon.tech/docs/guides/neon-auth) — a hosted instance of [Better Auth](https://www.better-auth.com) that Neon runs and proxies to, configured in `src/lib/auth/server.ts` (server) and `src/lib/auth/client.ts` (browser). The app never talks to Better Auth internals directly; `@neondatabase/auth`'s `createNeonAuth()` wraps it.

Access is locked to a single person in two independent layers:

1. **Sign-up** (`src/app/auth/sign-up/actions.ts`) rejects any email that isn't `ALLOWED_EMAIL` before even calling `auth.signUp.email()`.
2. **Every protected page and server action** calls `requireAllowedUserOrRedirect()` or `requireAllowedUserOrThrow()` (`src/lib/auth/guard.ts`), which checks `session.user.email === process.env.ALLOWED_EMAIL` and redirects (pages) or throws (actions) otherwise — a 403 in practice, even for someone who somehow gets a valid session.

`proxy.ts`'s middleware deliberately isn't trusted for this check (see above) — it only confirms *a* session exists, not *whose*.

Password reset uses Neon Auth's built-in `requestPasswordReset` / `resetPassword` endpoints (`src/app/auth/forgot-password/`, `src/app/auth/reset-password/`). There's no separate "forgot username" flow, because sign-in is by email and there's no separate username field — password reset covers account recovery. Changing your email isn't offered in the Account page either: Neon Auth's hosted backend doesn't expose a `change-email` endpoint through its SDK (confirmed by reading the type definitions — it's simply not in the set of methods Neon proxies through), and even if it were, this app's access check is hardcoded to one `ALLOWED_EMAIL` env var, so changing your sign-in email would need an env var update to match or you'd lock yourself out.

### Rate limiting

An in-memory sliding-window limiter (`src/lib/rate-limit.ts`) runs inside `requireAllowedUserOrRedirect`/`requireAllowedUserOrThrow` — so every protected page and action gets it for free — at 300 requests/minute/IP, and separately inside `/api/auth/[...path]` at 20/minute/IP (the actual credential-processing endpoint). It's deliberately simple: a `Map` that resets on cold start, not shared across instances or regions. No Redis/Upstash. For a single-user, low-traffic app this is a reasonable tradeoff, not a scaling plan.

It specifically does **not** live in `proxy.ts`/middleware — that was tried and the module-level state didn't reliably persist across requests there (verified in both dev and a production `next start` build; even a limit of 2 never triggered), while the same pattern in ordinary server-action code works correctly and persists across requests, matching how the TMDB/IGDB genre-list caches behave.

### External APIs

- **TMDB** (`src/lib/tmdb.ts`) — discover/search/recommendations/details for movies and TV. Genre lists are fetched once per server instance and cached in a module-level variable (TMDB's genre taxonomy essentially never changes). All calls go through server code; the API key never reaches the browser.
- **IGDB** (`src/lib/igdb.ts`) — games, authenticated via Twitch's client-credentials OAuth flow. The Twitch access token is cached until it expires (refreshed a minute early). IGDB's 4 requests/second limit is enforced with a small in-process throttle queue. IGDB also blocks browser calls outright (no CORS), so this has to be server-side regardless.
- Both are normalized into one shape (`NormalizedTitle` / `TitleCard`, `src/lib/normalize.ts`) before touching the database or UI, so the rest of the app never branches on "is this a movie or a game."

### Caching

Title metadata (title, year, poster, genres, runtime, original language) is fetched from TMDB/IGDB **once**, at the moment you add something, and stored directly on the row. The library, wishlist, Hall of Fame, and dashboard all read purely from Postgres — none of them call TMDB or IGDB. This is why the dashboard can compute "hours watched" and "top genres" instantly: it's aggregating columns you already have, not making N API calls per page view.

### The discovery popup, in detail

This is the most algorithmically involved part of the app (`src/components/discovery-popup.tsx` + `src/lib/actions/discovery.ts`). A few things worth calling out:

- **Random start page.** TMDB/IGDB's discover endpoints are deterministic per page — always starting from page 1 would show the same titles every time the popup opens. Instead it starts from a random page within a range still inside the popularity/vote-count filters, so repeat opens feel different without sacrificing quality.
- **Weighted language interleave.** For movies/TV, English and Korean results are merged with a weighted round-robin (`weightedInterleave`) where the weight is however many titles of that language you already have in your library (minimum 1, so a language you've barely touched still gets a small foothold instead of vanishing). This is deliberately *not* a flat 50/50 — someone with 300 English titles and 5 Korean ones shouldn't see an even split.
- **70/30 similar/fresh mix.** After you click something, its TMDB/IGDB recommendations get queued up, and roughly 70% of what you see next comes from that "similar" queue vs. 30% fresh popular titles — so clicking ten Marvel movies doesn't turn the rest of the session into all-Marvel.
- **Passive "passed over" detection.** An `IntersectionObserver` tracks which cards scroll past unclicked; once a card exits the top of the scroll area having been seen and never clicked, it's quietly swapped out for a replacement. This is what lets you scroll through and ignore a whole row without an explicit "none of these" button — the grid just keeps replenishing itself.
- **Session-only exclusion, not persistence.** "Show more" and passive cycling both add the current batch to an in-memory `exclude` set for the rest of that popup session — but nothing is written to the database for a skip. Close and reopen the popup, and previously-passed-on titles are fair game again.

### Progressive rendering

Library/wishlist/Hall of Fame grids can hold hundreds of titles, each with its own Radix context-menu instance — mounting all of them at once was the actual bottleneck, not the data fetch. `src/lib/use-progressive-reveal.ts` reveals an already-fetched list in batches of 60 via an `IntersectionObserver` sentinel at the bottom of the grid, the same pattern Search already used for its own infinite scroll. Re-rendering on a filter/sort change resets the revealed count using React's documented ["adjust state during render"](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes) pattern rather than a `useEffect` — see [Issues](#issues-encountered--how-they-were-solved) for why.

### Security headers

Set in `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, a restrictive `Permissions-Policy`, and HSTS. There's deliberately no `Content-Security-Policy` yet — a wrong one can silently break Neon Auth's session calls or Next's own hydration, and for a single-user app that means locking out the one real user with no clear error. Adding one needs to happen with the app open and testable against a live deploy, not blind.

## Project structure

```
src/
  app/
    (app)/                  # everything behind the auth guard
      account/               Account page — profile, data export/import
      games/ movies/ tv/      Library tabs
      hall-of-fame/           Hall of Fame (Movies/TV/Games sub-tabs)
      wishlist/               Wishlist (Movies/TV/Games sub-tabs)
      search/                 Cross-type / type-locked search
      layout.tsx              Auth guard + TopNav/Footer/BottomTabBar shell
      page.tsx                Home dashboard
    api/
      auth/[...path]/         Neon Auth's own route handler
      backfill-game-playtime/ One-off migration endpoint (auth-guarded)
    auth/
      sign-in/ sign-up/        Credential forms + server actions
      forgot-password/         Request a reset email
      reset-password/          Set a new password from the emailed token
    forbidden/                403 page (wrong account, valid session)
    layout.tsx                 Root layout, intro animation, fonts
    globals.css                 Theme tokens, keyframes
  components/                 UI — grids, popup, nav, forms, shadcn primitives in ui/
  lib/
    actions/                  Server actions: items, wishlist, search, discovery, dashboard, settings (export/import), account (name/password)
    auth/                     Neon Auth server/client instances + the ALLOWED_EMAIL guard
    tmdb.ts / igdb.ts          External API clients (server-only)
    normalize.ts                Shared TitleCard/NormalizedTitle shape
    filter-sort.ts              Client-side filter/sort for grids
    rate-limit.ts                In-memory sliding-window limiter
    external-links.ts            "View more info" URL builder (TMDB/IGDB)
    use-progressive-reveal.ts    Batch-reveal hook for large grids
  db/
    schema.ts                   Drizzle table definitions
    index.ts                    Drizzle + Neon HTTP driver instance
drizzle/                      Generated SQL migrations + snapshots
proxy.ts                      Next.js middleware (session-exists check only)
next.config.ts                 Image domains, security headers
drizzle.config.ts              drizzle-kit config
```

## Setup, step by step

See the [README's Setup section](./README.md#setup) for the short version. In full:

1. **Neon project** — create one with Neon Auth enabled, in the `ap-southeast-1` (Singapore) region to match this app's `Hosting`/`runtime region` choice (not required, just keeps the DB and app physically close).
2. **TMDB** — create an account, go to Settings → API, and generate an **API Read Access Token** (the long v4 bearer token — not the shorter v3 "API Key").
3. **Twitch app for IGDB** — register an app at [dev.twitch.tv/console](https://dev.twitch.tv/console); IGDB auth goes through Twitch's client-credentials flow, so you need a Client ID and Client Secret, not an IGDB-specific key.
4. **Clone + install**: `git clone … && cd Playd && npm install`.
5. **Env**: `cp .env.example .env.local`, fill in every value (see the table in `.env.example` and the README).
6. **Migrate**: `npm run db:migrate` — applies everything in `drizzle/` to your Neon branch.
7. **Run**: `npm run dev`, open `localhost:3000`, sign up with the email in `ALLOWED_EMAIL`.

Useful scripts: `npm run db:generate` (new migration after editing `src/db/schema.ts`), `npm run db:studio` (Drizzle Studio GUI against your DB), `npm run lint`, `npm run build`.

## Deployment

This project is live on **Netlify**, auto-deploying from `main` on this GitHub repo. The original plan (see the leftover `vercel.json`, unused) targeted Vercel, but the actual deployment ended up on Netlify instead — the app has no Vercel-specific code, so this was a dashboard-only decision, not a rewrite.

Steps, in the order they actually happened:

1. Push to GitHub.
2. Create a Netlify site from the GitHub repo.
3. Add every variable from `.env.example` in Netlify → Site configuration → Environment variables.
4. First deploy failed — see [Issue: Netlify secrets-scan false positives](#issue-netlify-secrets-scan-false-positives) below for the fix (two more env vars, no code change).
5. Deploy succeeded, but sign-in silently looped back to the sign-in page — see [Issue: post-deploy sign-in loop](#issue-post-deploy-sign-in-loop) below.
6. Optional cleanup: turned off Netlify's "Powered by Netlify" badge (Project configuration → General → Powered by Netlify badge) — purely cosmetic, see [Issue: the Netlify badge](#issue-the-powered-by-netlify-badge).

## Issues encountered & how they were solved

This is a real log of problems hit while building and shipping this — not a hypothetical list. Each one includes the actual cause and fix, written up right after solving it.

### Issue: lint rejected the "reset on filter change" logic for progressive rendering

**Symptom:** Building `useProgressiveReveal` (batch-reveal for large grids), the natural first instinct — reset the revealed count in a `useEffect` when the filtered list changes — tripped the `react-hooks/set-state-in-effect` lint rule. Switching to a `useRef` compared during render instead tripped a *different* rule, `react-hooks/refs` ("cannot access/update ref value during render").

**Fix:** React's own documented pattern for this exact situation — [adjusting state during render](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes) — using a second piece of state to detect the change:

```ts
const [prevItems, setPrevItems] = useState(items);
if (prevItems !== items) {
  setPrevItems(items);
  setCount(PAGE_SIZE);
}
```

This satisfies both rules because it's neither an effect nor a ref write — it's a conditional `setState` call during the render itself, which React explicitly supports and bails out a re-render for instead of committing stale UI.

### Issue: `git push` rejected — GH007, private email

**Symptom:** After the initial commit and `git push -u origin main`, GitHub rejected the push with `GH007: Your push would publish a private email address` — the commit's author email was the real Gmail address, and the GitHub account has "keep email private" enabled.

**Fix:** Used the account's GitHub-provided noreply address (`<id>+<username>@users.noreply.github.com`) instead. Set it as the **repo-local** `git config user.email` (not global — this repo's committer shouldn't silently change every other repo's commits too), then `git commit --amend --reset-author --no-edit` on the still-unpushed commit, then pushed again successfully.

### Issue: Netlify secrets-scan false positives

**Symptom:** The first Netlify deploy failed with "Secrets scanning found 4 instance(s) of secrets in build output or repo code" — hundreds of matches for `NEON_BRANCH` across `.gitignore`, Turbopack cache files, Next.js framework source and `node_modules`, plus a handful of genuine matches for `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` and `NEON_AUTH_COOKIE_SECRET`.

**Cause, two separate things:**
1. Next.js's Turbopack persistent build cache (`.next/cache/turbopack/*.sst`) stores raw env-var values for cache-invalidation purposes. Netlify's Next.js runtime bundles that cache into the deploy output, and Netlify's secrets scanner greps the *entire* output for the literal value of every env var configured in the dashboard — including that cache, which was never meant to be scanned as "shipped code."
2. `NEON_BRANCH`'s value is the generic word `"production"`, which naturally appears all over framework source, comments, and config — a flood of false positives unrelated to any real secret.

**Fix:** No code change — two more Netlify environment variables:
- `SECRETS_SCAN_OMIT_PATHS` = `.netlify/.next/cache/**,.next/cache/**` (stop scanning the build cache at all)
- `SECRETS_SCAN_OMIT_KEYS` = `NEON_BRANCH` (stop treating this one generic-valued var as a secret to scan for)

Then a "Clear cache and deploy site" to rebuild clean.

### Issue: post-deploy sign-in loop

**Symptom:** After the Netlify deploy finally succeeded, signing in on the live URL looked like it did nothing — submitting the form just bounced back to the sign-in page, with no console error and no visible failure anywhere.

**Cause:** Neon Auth only allows sign-in to complete for origins on its **trusted domains** allowlist, and the app had only ever been signed into from `localhost` — the brand-new Netlify domain was never registered. `auth.signIn.email()` was silently failing to issue a valid session for the untrusted origin, but the sign-in server action (`src/app/auth/sign-in/actions.ts`) only checked for an explicit `error` field and then *unconditionally* called `redirect("/")` — landing on `/`, where the `(app)` layout's guard immediately bounced back to `/auth/sign-in` since no session existed. Two silent 307 redirects in a row, which is exactly why there was nothing in the browser console to find.

**Fix:** Confirmed via the Neon API that the trusted-domains list for the project's Auth branch was completely empty (not even `localhost` was on it — local sign-in apparently worked through a separate dev-mode trust path). Registered the live Netlify URL as a trusted domain, and sign-in started working immediately. (Neon console path: your project → Auth → Trusted domains.)

### Issue: the "Powered by Netlify" badge

**Symptom:** A "Powered by Netlify" pill appeared in the bottom corner of the deployed site.

**Cause:** Netlify shows this badge on new sites by default as of a 2026-08-19 rollout — nothing in this repo added it; there's no Netlify config file or dependency involved at all.

**Fix:** Dashboard-only — Netlify project → **Project configuration → General → Powered by Netlify badge**, toggled off. Takes effect on the next request, no redeploy needed.

## Known limitations

These are deliberate, not oversights:

- **No email change.** Neon Auth's hosted backend doesn't expose a `change-email` endpoint through its client/server SDK, and the app's access control is a single hardcoded `ALLOWED_EMAIL` env var anyway — changing it would need a matching env var update to avoid locking yourself out.
- **No transactions on import.** The Neon HTTP driver used here doesn't support them; each table's import is a separate `onConflictDoNothing()` insert, which is safe to re-run but not atomic across tables. Fine for a personal single-user dataset, not something to build a multi-step wizard on top of.
- **Rate limiting is in-memory and per-instance.** Resets on cold start, isn't shared across regions. A deliberate tradeoff against standing up Redis/Upstash for a low-traffic personal app — revisit only if that assumption stops holding.
- **No Content-Security-Policy yet.** Needs to be added and tested live against a real deploy rather than guessed at, since a wrong policy fails silently and can lock out the one real user.
- **Games' "View more info" links to an IGDB search, not a direct page.** IGDB doesn't expose a stable public URL from an id alone (it needs the game's slug, which isn't stored) — movies/TV link directly since `source_id` is the TMDB id itself.
