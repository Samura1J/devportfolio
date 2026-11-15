import type { Movie } from "@portfolio/shared";
import { fetchMovies } from "./api";
import { useRequest, type RequestState } from "./useRequest";

/** The movie for `?movie=`, from the (cached) list. Success with undefined: not showing. */
export function useMovie(movieId: number | undefined): [RequestState<Movie | undefined>, () => void] {
  return useRequest(`movie:${String(movieId)}`, async () => {
    if (movieId === undefined) return undefined;
    return (await fetchMovies()).find((movie) => movie.id === movieId);
  });
}
