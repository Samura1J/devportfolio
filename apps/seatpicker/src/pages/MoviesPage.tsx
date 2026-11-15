import { Card, cn, focusRing } from "@portfolio/ui";
import { Link } from "react-router";
import { fetchMovies } from "../api";
import { ErrorPanel, PageHeading } from "../Layout";
import { selectionSearch } from "../selection";
import { useRequest } from "../useRequest";

export function MoviesPage() {
  const [movies, retry] = useRequest("movies", fetchMovies);

  return (
    <>
      <PageHeading step={1} title="Choose a movie">
        Today&apos;s trending movies, live from TMDB.
      </PageHeading>

      {movies.status === "error" ? (
        <ErrorPanel message={movies.message} onRetry={retry} />
      ) : (
        <ul aria-busy={movies.status === "loading"} className="grid grid-cols-2 gap-gutter-md md:grid-cols-4">
          {movies.status === "loading"
            ? Array.from({ length: 4 }, (_, i) => (
                <li key={i} aria-hidden>
                  <div className="aspect-[2/3] bg-surface-container-high motion-safe:animate-pulse" />
                  <div className="mt-3 h-5 w-3/4 bg-surface-container-high motion-safe:animate-pulse" />
                </li>
              ))
            : movies.data.map((movie) => (
                <li key={movie.id}>
                  <Link
                    to={{ pathname: "/seats", search: selectionSearch({ movieId: movie.id, seats: [] }) }}
                    className={cn("group block", focusRing)}
                  >
                    <Card interactive className="overflow-hidden">
                      <img
                        src={movie.posterUrl}
                        alt=""
                        width={500}
                        height={750}
                        className="aspect-[2/3] w-full object-cover transition-transform motion-safe:group-hover:scale-[1.02]"
                      />
                    </Card>
                    <span className="mt-3 block font-headline text-headline-sm group-hover:text-primary">
                      {movie.title}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
      )}
      {movies.status === "loading" && (
        <p role="status" className="sr-only">
          Loading movies…
        </p>
      )}
    </>
  );
}
