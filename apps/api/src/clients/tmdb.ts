import type { Movie } from "@portfolio/shared";
import { z } from "zod";
import { fetchJson, type FetchFn } from "../lib/fetchJson";
import { TtlCache } from "../lib/ttlCache";

const TRENDING_URL = "https://api.themoviedb.org/3/trending/movie/day?language=en-US";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const MOVIE_COUNT = 4;

/** Only the fields we use; extra fields are ignored. */
const TrendingResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.number().int().positive(),
      title: z.string().min(1),
      poster_path: z.string().nullable(),
    }),
  ),
});

export interface MovieCatalog {
  listMovies(): Promise<Movie[]>;
  /** Looks up a movie in the current list, so clients can't invent titles. */
  findMovie(id: number): Promise<Movie | undefined>;
}

interface TmdbOptions {
  readToken: string;
  fetchFn?: FetchFn;
  ttlMs?: number;
  now?: () => number;
}

export function createTmdbCatalog({ readToken, fetchFn, ttlMs = 60 * 60 * 1000, now }: TmdbOptions): MovieCatalog {
  const cache = new TtlCache<"trending", Movie[]>({ ttlMs, maxEntries: 1, ...(now ? { now } : {}) });

  const load = async (): Promise<Movie[]> => {
    const data = await fetchJson(TRENDING_URL, {
      upstream: "TMDB",
      schema: TrendingResponseSchema,
      init: { headers: { accept: "application/json", Authorization: `Bearer ${readToken}` } },
      ...(fetchFn ? { fetchFn } : {}),
    });
    return data.results
      .flatMap((movie) =>
        movie.poster_path ? [{ id: movie.id, title: movie.title, posterUrl: `${POSTER_BASE}${movie.poster_path}` }] : [],
      )
      .slice(0, MOVIE_COUNT);
  };

  const listMovies = () => cache.getOrLoad("trending", load);

  return {
    listMovies,
    async findMovie(id) {
      return (await listMovies()).find((movie) => movie.id === id);
    },
  };
}
