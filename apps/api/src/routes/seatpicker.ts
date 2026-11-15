import {
  CheckoutRequestSchema,
  CheckoutSessionIdSchema,
  type CheckoutResponse,
  type CheckoutSummary,
  type Movie,
} from "@portfolio/shared";
import { Router } from "express";
import type { CheckoutGateway } from "../clients/checkout";
import type { MovieCatalog } from "../clients/tmdb";
import type { Config } from "../config";
import { HttpError, notConfigured, parseInput } from "../lib/errors";

interface SeatpickerDeps {
  config: Config;
  movies: MovieCatalog | undefined;
  checkout: CheckoutGateway | undefined;
}

export function seatpickerRouter({ config, movies, checkout }: SeatpickerDeps): Router {
  const router = Router();
  const appBase = `${config.publicUrl}/projects/seatpicker`;

  router.get("/movies", async (_req, res) => {
    if (!movies) throw notConfigured("Movies");
    const body: Movie[] = await movies.listMovies();
    res.json(body);
  });

  router.post("/checkout", async (req, res) => {
    if (!movies) throw notConfigured("Movies");
    if (!checkout) throw notConfigured("Checkout");
    const { movieId, seats } = parseInput(CheckoutRequestSchema, req.body);

    // Resolve the movie ourselves: the client only sends an id.
    const movie = await movies.findMovie(movieId);
    if (!movie) {
      throw new HttpError(400, "unknown_movie", "That movie is no longer showing. Please pick another.");
    }

    const backToSeats = new URLSearchParams({ movie: String(movie.id), seats: seats.join(",") });
    const session = await checkout.createSession({
      movie,
      seats,
      // Stripe fills in {CHECKOUT_SESSION_ID}; it must stay unencoded.
      successUrl: `${appBase}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appBase}/cancel?${backToSeats.toString()}`,
    });
    const body: CheckoutResponse = { url: session.url };
    res.status(201).json(body);
  });

  router.get("/checkout/:sessionId", async (req, res) => {
    if (!checkout) throw notConfigured("Checkout");
    const sessionId = parseInput(CheckoutSessionIdSchema, req.params.sessionId);
    const body: CheckoutSummary = await checkout.getSummary(sessionId);
    res.json(body);
  });

  return router;
}
