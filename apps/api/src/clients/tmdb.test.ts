import { describe, expect, it, vi } from "vitest";
import { createTmdbCatalog } from "./tmdb";

const trending = {
  page: 1,
  results: [
    { id: 1, title: "One", poster_path: "/1.jpg", popularity: 9 },
    { id: 2, title: "No Poster", poster_path: null },
    { id: 3, title: "Three", poster_path: "/3.jpg" },
    { id: 4, title: "Four", poster_path: "/4.jpg" },
    { id: 5, title: "Five", poster_path: "/5.jpg" },
    { id: 6, title: "Six", poster_path: "/6.jpg" },
  ],
};

describe("TMDB catalog", () => {
  it("returns the top four movies that have posters, sending the bearer token", async () => {
    const fetchFn = vi.fn((_url: string | URL | Request, _init?: RequestInit) =>
      Promise.resolve(Response.json(trending)),
    );
    const catalog = createTmdbCatalog({ readToken: "tok", fetchFn });

    const movies = await catalog.listMovies();
    expect(movies.map((m) => m.id)).toEqual([1, 3, 4, 5]);
    expect(movies[0]?.posterUrl).toBe("https://image.tmdb.org/t/p/w500/1.jpg");
    expect(new Headers(fetchFn.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer tok");
  });

  it("caches the list, and findMovie only finds listed movies", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(Response.json(trending)));
    const catalog = createTmdbCatalog({ readToken: "tok", fetchFn });

    expect((await catalog.findMovie(3))?.title).toBe("Three");
    expect(await catalog.findMovie(2)).toBeUndefined(); // filtered out: no poster
    expect(await catalog.findMovie(6)).toBeUndefined(); // not in the top four
    await catalog.listMovies();
    expect(fetchFn).toHaveBeenCalledOnce();
  });
});
