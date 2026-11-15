import {
  API_BASE,
  ApiErrorSchema,
  ForecastResponseSchema,
  LocationSearchResponseSchema,
  type ForecastResponse,
} from "@portfolio/shared";
import type { z } from "zod";
import type { Place } from "./places";

const FALLBACK_MESSAGE = "The forecast couldn't be loaded. Please try again.";

/** A failure whose message is safe and useful to show. */
export class ForecastError extends Error {
  override name = "ForecastError";
}

async function getJson<T extends z.ZodType>(path: string, schema: T, signal?: AbortSignal): Promise<z.infer<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { signal: signal ?? null });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ForecastError("Couldn't reach the weather service. Check your connection and try again.");
  }

  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const apiError = ApiErrorSchema.safeParse(body);
    throw new ForecastError(apiError.success ? apiError.data.error.message : FALLBACK_MESSAGE);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ForecastError(FALLBACK_MESSAGE);
  return parsed.data;
}

export function fetchForecast(place: Place, signal?: AbortSignal): Promise<ForecastResponse> {
  const query = new URLSearchParams({ lat: String(place.lat), lon: String(place.lon) });
  return getJson(`/weather?${query.toString()}`, ForecastResponseSchema, signal);
}

export function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q: query });
  return getJson(`/weather/search?${params.toString()}`, LocationSearchResponseSchema, signal);
}
