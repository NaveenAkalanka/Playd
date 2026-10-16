import "server-only";
import type { NormalizedTitle, TitleCard } from "@/lib/normalize";

const IGDB_BASE_URL = "https://api.igdb.com/v4";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";

const MAX_REQUESTS_PER_WINDOW = 4;
const WINDOW_MS = 1000;

let cachedToken: { accessToken: string; expiresAt: number } | null = null;
const recentRequestTimestamps: number[] = [];

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const url = new URL(TWITCH_TOKEN_URL);
  url.searchParams.set("client_id", process.env.TWITCH_CLIENT_ID!);
  url.searchParams.set("client_secret", process.env.TWITCH_CLIENT_SECRET!);
  url.searchParams.set("grant_type", "client_credentials");

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    accessToken: data.access_token,
    // refresh a minute early to avoid using a token that expires mid-request
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

async function throttle() {
  const now = Date.now();
  while (recentRequestTimestamps.length > 0 && now - recentRequestTimestamps[0] > WINDOW_MS) {
    recentRequestTimestamps.shift();
  }

  if (recentRequestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const waitMs = WINDOW_MS - (now - recentRequestTimestamps[0]);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return throttle();
  }

  recentRequestTimestamps.push(now);
}

async function igdbFetch<T>(endpoint: string, query: string): Promise<T> {
  await throttle();
  const accessToken = await getAccessToken();

  const res = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID!,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/plain",
    },
    body: query,
  });

  if (!res.ok) {
    throw new Error(`IGDB request failed: ${res.status} ${endpoint}`);
  }

  return res.json() as Promise<T>;
}

interface IgdbGenre {
  name: string;
}

interface IgdbCover {
  url: string;
}

interface IgdbGame {
  id: number;
  name: string;
  first_release_date?: number;
  cover?: IgdbCover;
  genres?: IgdbGenre[];
  similar_games?: number[];
}

export function igdbCoverUrl(
  rawUrl: string | undefined,
  size: "t_cover_big" | "t_cover_small" | "t_screenshot_big" = "t_cover_big",
): string | null {
  if (!rawUrl) return null;
  const withProtocol = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
  return withProtocol.replace(/t_[a-z_]+/, size);
}

function yearFromUnix(timestamp: number | undefined): number | null {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).getUTCFullYear();
}

function toTitleCard(game: IgdbGame): TitleCard {
  return {
    mediaType: "game",
    sourceId: game.id,
    title: game.name,
    year: yearFromUnix(game.first_release_date),
    posterUrl: igdbCoverUrl(game.cover?.url),
    genreNames: game.genres?.map((g) => g.name),
  };
}

function toNormalizedTitle(game: IgdbGame): NormalizedTitle {
  return {
    mediaType: "game",
    sourceId: game.id,
    title: game.name,
    year: yearFromUnix(game.first_release_date),
    posterUrl: igdbCoverUrl(game.cover?.url),
    backdropUrl: null,
    genres: game.genres?.map((g) => g.name) ?? [],
    runtimeMinutes: null,
    originalLanguage: null,
  };
}

export async function getPopularGames(
  limit = 20,
  offset = 0,
): Promise<TitleCard[]> {
  const games = await igdbFetch<IgdbGame[]>(
    "games",
    `fields name,cover.url,first_release_date,rating_count,genres.name; where rating_count > 50; sort rating_count desc; limit ${limit}; offset ${offset};`,
  );
  return games.map(toTitleCard);
}

export async function getSimilarGames(
  igdbId: number,
  limit = 20,
): Promise<TitleCard[]> {
  const [game] = await igdbFetch<IgdbGame[]>(
    "games",
    `fields similar_games; where id = ${igdbId};`,
  );

  if (!game?.similar_games?.length) return [];

  const ids = game.similar_games.slice(0, limit).join(",");
  const games = await igdbFetch<IgdbGame[]>(
    "games",
    `fields name,cover.url,first_release_date; where id = (${ids});`,
  );
  return games.map(toTitleCard);
}

export async function searchGames(
  query: string,
  limit = 20,
  offset = 0,
): Promise<TitleCard[]> {
  // Escape backslashes first, then quotes — doing it in the other order
  // would double-escape the backslashes this step itself introduces.
  const sanitized = query.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const games = await igdbFetch<IgdbGame[]>(
    "games",
    `search "${sanitized}"; fields name,cover.url,first_release_date,genres.name; limit ${limit}; offset ${offset};`,
  );
  return games.map(toTitleCard);
}

// IGDB's genre taxonomy essentially never changes — fetch once per server
// instance and reuse, instead of hitting the API on every search.
let genreCache: string[] | null = null;

export async function getGameGenreNames(): Promise<string[]> {
  if (!genreCache) {
    const genres = await igdbFetch<{ name: string }[]>(
      "genres",
      "fields name; sort name asc; limit 50;",
    );
    genreCache = genres.map((g) => g.name);
  }
  return genreCache;
}

interface IgdbTimeToBeat {
  game_id: number;
  hastily?: number;
  normally?: number;
  completely?: number;
}

/**
 * Playtime in minutes per game id, from IGDB "time to beat" (seconds).
 * Uses the normal-pace figure, falling back to rushed then completionist.
 * Games IGDB has no data for are omitted.
 */
export async function getGameTimesToBeat(
  igdbIds: number[],
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  const BATCH = 500;

  for (let i = 0; i < igdbIds.length; i += BATCH) {
    const ids = igdbIds.slice(i, i + BATCH).join(",");
    const rows = await igdbFetch<IgdbTimeToBeat[]>(
      "game_time_to_beats",
      `fields game_id,hastily,normally,completely; where game_id = (${ids}); limit ${BATCH};`,
    );
    for (const row of rows) {
      const seconds = row.normally ?? row.hastily ?? row.completely;
      if (seconds) result.set(row.game_id, Math.round(seconds / 60));
    }
  }

  return result;
}

export async function getGameDetails(
  igdbId: number,
): Promise<NormalizedTitle> {
  const [games, times] = await Promise.all([
    igdbFetch<IgdbGame[]>(
      "games",
      `fields name,cover.url,first_release_date,genres.name; where id = ${igdbId};`,
    ),
    getGameTimesToBeat([igdbId]),
  ]);

  const [game] = games;
  if (!game) {
    throw new Error(`IGDB game not found: ${igdbId}`);
  }

  return { ...toNormalizedTitle(game), runtimeMinutes: times.get(igdbId) ?? null };
}
