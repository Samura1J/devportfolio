import {
  API_BASE,
  ApiErrorSchema,
  CheckoutResponseSchema,
  CheckoutSummarySchema,
  MovieListSchema,
  SeatAvailabilitySchema,
  SeatsTakenErrorSchema,
  type CheckoutRequest,
  type CheckoutSummary,
  type Movie,
  type SeatId,
} from "@portfolio/shared";
import type { z } from "zod";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

/** A failure whose message is safe and useful to show. */
export class ApiRequestError extends Error {
  override name = "ApiRequestError";
}

/** Checkout lost a race: someone else got these seats first. */
export class SeatsTakenError extends ApiRequestError {
  override name = "SeatsTakenError";
  constructor(
    message: string,
    readonly seats: SeatId[],
  ) {
    super(message);
  }
}

async function request<T extends z.ZodType>(
  path: string,
  schema: T,
  init: Omit<RequestInit, "signal"> & { signal?: AbortSignal | undefined } = {},
): Promise<z.infer<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, signal: init.signal ?? null });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiRequestError("Couldn't reach the server. Check your connection and try again.");
  }

  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const taken = SeatsTakenErrorSchema.safeParse(body);
    if (taken.success) throw new SeatsTakenError(taken.data.error.message, taken.data.error.seats);
    const apiError = ApiErrorSchema.safeParse(body);
    throw new ApiRequestError(apiError.success ? apiError.data.error.message : FALLBACK_MESSAGE);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiRequestError(FALLBACK_MESSAGE);
  return parsed.data;
}

/** The server caches this list for an hour; keep one copy per page load too. */
let movies: Promise<Movie[]> | undefined;

export function fetchMovies(): Promise<Movie[]> {
  movies ??= request("/movies", MovieListSchema).catch((error: unknown) => {
    movies = undefined; // let the next attempt retry
    throw error;
  });
  return movies;
}

/** Test hook: forget the cached list. */
export function resetMovieCache(): void {
  movies = undefined;
}

export async function startCheckout(order: CheckoutRequest): Promise<string> {
  const { url } = await request("/checkout", CheckoutResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  return url;
}

/** Seats sold or held by someone else for today's showing. */
export async function fetchTakenSeats(movieId: number, signal?: AbortSignal): Promise<SeatId[]> {
  const { taken } = await request(`/movies/${String(movieId)}/seats`, SeatAvailabilitySchema, { signal });
  return taken;
}

export function fetchCheckoutSummary(sessionId: string, signal?: AbortSignal): Promise<CheckoutSummary> {
  return request(`/checkout/${encodeURIComponent(sessionId)}`, CheckoutSummarySchema, { signal });
}

/** Stripe Checkout lives on another origin. Tests replace `assign` to catch the redirect. */
export const browser = {
  assign(url: string) {
    window.location.assign(url);
  },
};

export const errorMessage = (error: unknown) =>
  error instanceof ApiRequestError ? error.message : FALLBACK_MESSAGE;
