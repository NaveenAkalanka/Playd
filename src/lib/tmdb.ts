import "server-only";
import type { NormalizedTitle, TitleCard } from "@/lib/normalize";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export type TmdbLanguage = "en" | "ko";
export type TmdbMediaType = "movie" | "tv";

interface TmdbListItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  original_language: string;
  genre_ids?: number[];
}

interface TmdbListResponse {
  page: number;
  results: TmdbListItem[];
  total_pages: number;
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbGenreListResponse {
  genres: TmdbGenre[];
}

// TMDB's genre taxonomy essentially never changes — fetch once per server
// instance and reuse, instead of hitting the API on every search.
let movieGenreCache: TmdbGenre[] | null = null;
let tvGenreCache: TmdbGenre[] | null = null;

export async function getMovieGenres(): Promise<TmdbGenre[]> {
  if (!movieGenreCache) {
    movieGenreCache = (await tmdbFetch<TmdbGenreListResponse>("/genre/movie/list")).genres;
  }
  return movieGenreCache;
}

export async function getTvGenres(): Promise<TmdbGenre[]> {
  if (!tvGenreCache) {
    tvGenreCache = (await tmdbFetch<TmdbGenreListResponse>("/genre/tv/list")).genres;
  }
  return tvGenreCache;
}

interface TmdbMovieDetails {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: TmdbGenre[];
  runtime: number | null;
  original_language: string;
}

interface TmdbTvDetails {
  id: number;
  name: string;
  first_air_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: TmdbGenre[];
  episode_run_time: number[];
  number_of_episodes: number | null;
  original_language: string;
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`TMDB request failed: ${res.status} ${path}`);
  }

  return res.json() as Promise<T>;
}

function posterUrl(path: string | null): string | null {
  return path ? `${TMDB_IMAGE_BASE_URL}/w500${path}` : null;
}

function backdropUrl(path: string | null): string | null {
  return path ? `${TMDB_IMAGE_BASE_URL}/w1280${path}` : null;
}

function yearFromDate(date: string | null | undefined): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function toTitleCard(
  item: TmdbListItem,
  mediaType: TmdbMediaType,
  genreMap?: Map<number, string>,
): TitleCard {
  return {
    mediaType,
    sourceId: item.id,
    title: item.title ?? item.name ?? "",
    year: yearFromDate(item.release_date ?? item.first_air_date),
    posterUrl: posterUrl(item.poster_path),
    genreNames: genreMap && item.genre_ids
      ? item.genre_ids.map((id) => genreMap.get(id)).filter((n): n is string => Boolean(n))
      : undefined,
  };
}

function dedupeById(lists: TmdbListItem[][]): TmdbListItem[] {
  const seen = new Set<number>();
  const merged: TmdbListItem[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
  }
  return merged;
}

export async function discoverMovies(
  // Undefined means "any language" — used when browsing popular movies from
  // Search, which (unlike the Discover popup) has no language filter.
  language: TmdbLanguage | undefined,
  page = 1,
): Promise<TitleCard[]> {
  const baseParams: Record<string, string> = {
    "vote_count.gte": "200",
    page: String(page),
  };
  if (language) baseParams.with_original_language = language;

  const [byPopularity, byVoteCount, genres] = await Promise.all([
    tmdbFetch<TmdbListResponse>("/discover/movie", {
      ...baseParams,
      sort_by: "popularity.desc",
    }),
    tmdbFetch<TmdbListResponse>("/discover/movie", {
      ...baseParams,
      sort_by: "vote_count.desc",
    }),
    getMovieGenres(),
  ]);
  const genreMap = new Map(genres.map((g) => [g.id, g.name]));
  return dedupeById([byPopularity.results, byVoteCount.results]).map((item) =>
    toTitleCard(item, "movie", genreMap),
  );
}

export async function discoverTv(
  language: TmdbLanguage | undefined,
  page = 1,
): Promise<TitleCard[]> {
  const baseParams: Record<string, string> = {
    "vote_count.gte": "100",
    page: String(page),
  };
  if (language) baseParams.with_original_language = language;

  const [byPopularity, byVoteCount, genres] = await Promise.all([
    tmdbFetch<TmdbListResponse>("/discover/tv", {
      ...baseParams,
      sort_by: "popularity.desc",
    }),
    tmdbFetch<TmdbListResponse>("/discover/tv", {
      ...baseParams,
      sort_by: "vote_count.desc",
    }),
    getTvGenres(),
  ]);
  const genreMap = new Map(genres.map((g) => [g.id, g.name]));
  return dedupeById([byPopularity.results, byVoteCount.results]).map((item) =>
    toTitleCard(item, "tv", genreMap),
  );
}

export async function getMovieRecommendations(
  tmdbId: number,
  page = 1,
): Promise<TitleCard[]> {
  const data = await tmdbFetch<TmdbListResponse>(
    `/movie/${tmdbId}/recommendations`,
    { page: String(page) },
  );
  return data.results.map((item) => toTitleCard(item, "movie"));
}

export async function getTvRecommendations(
  tmdbId: number,
  page = 1,
): Promise<TitleCard[]> {
  const data = await tmdbFetch<TmdbListResponse>(
    `/tv/${tmdbId}/recommendations`,
    { page: String(page) },
  );
  return data.results.map((item) => toTitleCard(item, "tv"));
}

export async function searchMovies(
  query: string,
  page = 1,
): Promise<TitleCard[]> {
  const [data, genres] = await Promise.all([
    tmdbFetch<TmdbListResponse>("/search/movie", { query, page: String(page) }),
    getMovieGenres(),
  ]);
  const genreMap = new Map(genres.map((g) => [g.id, g.name]));
  return data.results.map((item) => toTitleCard(item, "movie", genreMap));
}

export async function searchTv(
  query: string,
  page = 1,
): Promise<TitleCard[]> {
  const [data, genres] = await Promise.all([
    tmdbFetch<TmdbListResponse>("/search/tv", { query, page: String(page) }),
    getTvGenres(),
  ]);
  const genreMap = new Map(genres.map((g) => [g.id, g.name]));
  return data.results.map((item) => toTitleCard(item, "tv", genreMap));
}

export async function getMovieDetails(
  tmdbId: number,
): Promise<NormalizedTitle> {
  const details = await tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`);

  return {
    mediaType: "movie",
    sourceId: details.id,
    title: details.title,
    year: yearFromDate(details.release_date),
    posterUrl: posterUrl(details.poster_path),
    backdropUrl: backdropUrl(details.backdrop_path),
    genres: details.genres.map((g) => g.name),
    runtimeMinutes: details.runtime ?? null,
    originalLanguage: details.original_language,
  };
}

export async function getTvDetails(tmdbId: number): Promise<NormalizedTitle> {
  const details = await tmdbFetch<TmdbTvDetails>(`/tv/${tmdbId}`);

  const avgEpisodeRuntime =
    details.episode_run_time.length > 0
      ? details.episode_run_time.reduce((a, b) => a + b, 0) /
        details.episode_run_time.length
      : null;
  const runtimeMinutes =
    avgEpisodeRuntime && details.number_of_episodes
      ? Math.round(avgEpisodeRuntime * details.number_of_episodes)
      : null;

  return {
    mediaType: "tv",
    sourceId: details.id,
    title: details.name,
    year: yearFromDate(details.first_air_date),
    posterUrl: posterUrl(details.poster_path),
    backdropUrl: backdropUrl(details.backdrop_path),
    genres: details.genres.map((g) => g.name),
    runtimeMinutes,
    originalLanguage: details.original_language,
  };
}
