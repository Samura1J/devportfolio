import { API_BASE, type ApiError, type HealthResponse } from "@portfolio/shared";
import express, { type ErrorRequestHandler, type Express } from "express";
import type { CheckoutGateway } from "./clients/checkout";
import type { Mailer } from "./clients/mailer";
import type { MovieCatalog } from "./clients/tmdb";
import type { WeatherService } from "./clients/weatherapi";
import type { Config } from "./config";
import { HttpError, UpstreamError } from "./lib/errors";
import type { RateLimitOptions } from "./lib/rateLimit";
import { contactRouter } from "./routes/contact";
import { seatpickerRouter } from "./routes/seatpicker";
import { stripeWebhookRouter, type WebhookVerifier } from "./routes/stripeWebhook";
import { createBookings, type Bookings } from "./seats/bookings";
import { openSeatStore } from "./seats/store";
import { weatherRouter } from "./routes/weather";

/** Everything the app talks to, injected so tests can pass fakes. */
export interface AppDeps {
  config: Config;
  movies?: MovieCatalog | undefined;
  checkout?: CheckoutGateway | undefined;
  /** Seat holds over `checkout`. Defaults to an in-memory store when checkout is configured. */
  bookings?: Bookings | undefined;
  verifyWebhook?: WebhookVerifier | undefined;
  checkoutLimit?: RateLimitOptions | undefined;
  mailer?: Mailer | undefined;
  weather?: WeatherService | undefined;
  contactLimit?: RateLimitOptions | undefined;
  weatherLimit?: RateLimitOptions | undefined;
}

/** Body-parser errors carry a `type`; map the common ones to clean 4xx. */
function bodyParserError(err: unknown): HttpError | undefined {
  if (typeof err !== "object" || err === null || !("type" in err)) return undefined;
  if (err.type === "entity.parse.failed") return new HttpError(400, "invalid_json", "Request body is not valid JSON.");
  if (err.type === "entity.too.large") return new HttpError(413, "payload_too_large", "Request body is too large.");
  return undefined;
}

/** Builds the app without listening, so tests can drive it directly. */
export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  // In dev the Vite proxy, and later nginx, connect from this machine; trust
  // their X-Forwarded-For so rate limiting sees the real client IP.
  app.set("trust proxy", "loopback");

  const bookings =
    deps.bookings ?? (deps.checkout ? createBookings({ store: openSeatStore(":memory:"), gateway: deps.checkout }) : undefined);

  // Before the JSON parser: Stripe's signature covers the raw body.
  app.use(API_BASE, stripeWebhookRouter({ verify: deps.verifyWebhook, bookings }));

  const api = express.Router();
  api.use(express.json({ limit: "16kb" }));
  api.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });

  api.get("/health", (_req, res) => {
    const body: HealthResponse = { ok: true };
    res.json(body);
  });
  api.use(
    seatpickerRouter({
      config: deps.config,
      movies: deps.movies,
      checkout: deps.checkout,
      bookings,
      checkoutLimit: deps.checkoutLimit,
    }),
  );
  api.use(contactRouter({ mailer: deps.mailer, limit: deps.contactLimit }));
  api.use(weatherRouter({ weather: deps.weather, limit: deps.weatherLimit }));

  app.use(API_BASE, api);

  app.use((_req, res) => {
    const body: ApiError = { error: { code: "not_found", message: "Not found" } };
    res.status(404).json(body);
  });

  const onError: ErrorRequestHandler = (err, req, res, _next) => {
    const known = err instanceof HttpError ? err : bodyParserError(err);
    if (known) {
      if (known instanceof UpstreamError) {
        console.error(`[${req.method} ${req.originalUrl}] ${known.upstream}: ${known.detail}`);
      }
      res.status(known.status).set(known.headers).json(known.toBody());
      return;
    }
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    const body: ApiError = { error: { code: "internal", message: "Internal server error" } };
    res.status(500).json(body);
  };
  app.use(onError);

  return app;
}
