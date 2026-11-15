import { z } from "zod";

/** Days the WeatherAPI plan returns (checked 2026-11-14; `days=7` gives 3). */
export const FORECAST_DAYS = 3;

/** Icon names; each has a matching `images/<condition>.svg` in the weather app. */
export const CONDITIONS = [
  "clear",
  "pcloudy",
  "cloudy",
  "mcloudy",
  "fog",
  "lightrain",
  "rain",
  "ishower",
  "oshower",
  "rainsnow",
  "lightsnow",
  "snow",
  "tstorm",
  "tsrain",
] as const;

export const ConditionSchema = z.enum(CONDITIONS);
export type Condition = z.infer<typeof ConditionSchema>;

/** A query-string number: rejects blanks (which `Number` would turn into 0). */
const coordinate = (min: number, max: number) =>
  z.string().trim().min(1, "is required").pipe(z.coerce.number<string>().min(min).max(max));

export const WeatherQuerySchema = z.object({
  lat: coordinate(-90, 90),
  lon: coordinate(-180, 180),
});
export type WeatherQuery = z.infer<typeof WeatherQuerySchema>;

export const DailyForecastSchema = z.object({
  /** Calendar date at the location, `YYYY-MM-DD`. */
  date: z.iso.date(),
  condition: ConditionSchema,
  /** WeatherAPI's own description, e.g. "Patchy rain nearby". */
  label: z.string().min(1),
  highC: z.number(),
  lowC: z.number(),
  highF: z.number(),
  lowF: z.number(),
  /** 0–100. */
  chanceOfRain: z.number().int().min(0).max(100),
});
export type DailyForecast = z.infer<typeof DailyForecastSchema>;

/**
 * No location name: WeatherAPI resolves coordinates to neighbourhoods
 * ("De Wallen" for Amsterdam), so the app shows its own city name.
 */
export const ForecastResponseSchema = z.object({
  days: z.array(DailyForecastSchema).min(1),
});
export type ForecastResponse = z.infer<typeof ForecastResponseSchema>;

export type TemperatureUnit = "C" | "F";

/** Formats a `YYYY-MM-DD` date without shifting it into the viewer's time zone. */
export function formatForecastDate(date: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** API results start at this many characters; shorter input only filters the local list. */
export const LOCATION_SEARCH_MIN_CHARS = 3;
export const LOCATION_SEARCH_MAX_RESULTS = 5;

export const LocationSearchQuerySchema = z.object({
  q: z.string().trim().min(LOCATION_SEARCH_MIN_CHARS).max(80),
});

/** A searchable place. Coordinates identify it: WeatherAPI's ids aren't validated upstream. */
export const LocationSchema = z.object({
  name: z.string().min(1).max(100),
  /** State or province; empty when WeatherAPI has none. */
  region: z.string().max(100),
  country: z.string().min(1).max(100),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type Location = z.infer<typeof LocationSchema>;

export const LocationSearchResponseSchema = z.array(LocationSchema).max(LOCATION_SEARCH_MAX_RESULTS);
