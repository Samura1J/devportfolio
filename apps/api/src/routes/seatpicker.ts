import {
  CheckoutRequestSchema,
  CheckoutSessionIdSchema,
  type CheckoutResponse,
  type CheckoutSummary,
  type Movie,
  type SeatAvailability,
} from "@portfolio/shared";
import { Router, type Request } from "express";
import { z } from "zod";
import type { CheckoutGateway } from "../clients/checkout";
import type { MovieCatalog } from "../clients/tmdb";
import type { Config } from "../config";
import { HttpError, notConfigured, parseInput } from "../lib/errors";
import { rateLimit, type RateLimitOptions } from "../lib/rateLimit";
import type { Bookings } from "../seats/bookings";

interface SeatpickerDeps {
  config: Config;
  movies: MovieCatalog | undefined;
  checkout: CheckoutGateway | undefined;
  bookings: Bookings | undefined;
  checkoutLimit?: RateLimitOptions | undefined;
}

const MovieIdParamSchema = z.coerce.number<string>().int().positive();

/** Seat holds belong to the visitor's IP (trust proxy is set for the dev proxy and nginx). */
const ownerOf = (req: Request) => req.ip ?? "unknown";

export function seatpickerRouter({ config, movies, checkout, bookings, checkoutLimit }: SeatpickerDeps): Router {
  const router = Router();
  const appBase = `${config.publicUrl}/projects/seatpicker`;

  const showingMovie = async (movieId: number): Promise<Movie> => {
    if (!movies) throw notConfigured("Movies");
    const movie = await movies.findMovie(movieId);
    if (!movie) {
      throw new HttpError(400, "unknown_movie", "That movie is no longer showing. Please pick another.");
    }
    return movie;
  };

  router.get("/movies", async (_req, res) => {
    if (!movies) throw notConfigured("Movies");
    const body: Movie[] = await movies.listMovies();
    res.json(body);
  });

  router.get("/movies/:movieId/seats", async (req, res) => {
    if (!bookings) throw notConfigured("Checkout");
    const movie = await showingMovie(parseInput(MovieIdParamSchema, req.params.movieId));
    const body: SeatAvailability = { taken: await bookings.takenSeats(movie.id, ownerOf(req)) };
    res.json(body);
  });

  router.post(
    "/checkout",
    // Each checkout opens a Stripe session and holds seats; keep that bounded.
    rateLimit(checkoutLimit ?? { limit: 20, windowMs: 15 * 60 * 1000 }),
    async (req, res) => {
      if (!movies) throw notConfigured("Movies");
      if (!bookings) throw notConfigured("Checkout");
      const { movieId, seats } = parseInput(CheckoutRequestSchema, req.body);

      // Resolve the movie ourselves: the client only sends an id.
      const movie = await showingMovie(movieId);

      const backToSeats = new URLSearchParams({ movie: String(movie.id), seats: seats.join(",") });
      const session = await bookings.checkout({
        movie,
        seats,
        owner: ownerOf(req),
        // Stripe fills in {CHECKOUT_SESSION_ID}; it must stay unencoded.
        successUrl: `${appBase}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appBase}/cancel?${backToSeats.toString()}`,
      });
      const body: CheckoutResponse = { url: session.url };
      res.status(201).json(body);
    },
  );

  router.get("/checkout/:sessionId", async (req, res) => {
    if (!checkout) throw notConfigured("Checkout");
    const sessionId = parseInput(CheckoutSessionIdSchema, req.params.sessionId);
    const body: CheckoutSummary = await checkout.getSummary(sessionId);
    // The buyer reaching this page is payment news too, webhook or not.
    if (body.paid) bookings?.settle(sessionId, true);
    else if (body.status === "expired") bookings?.settle(sessionId, false);
    res.json(body);
  });

  return router;
}
