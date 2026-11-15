import { FORECAST_DAYS, LOCATION_SEARCH_MAX_RESULTS, type ForecastResponse, type Location } from "@portfolio/shared";
import { z } from "zod";
import { fetchJson, type FetchFn } from "../lib/fetchJson";
import { TtlCache } from "../lib/ttlCache";
import { toCondition } from "./conditions";

const FORECAST_URL = "https://api.weatherapi.com/v1/forecast.json";
const SEARCH_URL = "https://api.weatherapi.com/v1/search.json";

const UpstreamSearchSchema = z.array(
  z.object({
    name: z.string(),
    region: z.string(),
    country: z.string(),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
);

/** Only the fields we use; extra fields are ignored. */
const UpstreamForecastSchema = z.object({
  forecast: z.object({
    forecastday: z
      .array(
        z.object({
          date: z.iso.date(),
          day: z.object({
            maxtemp_c: z.number(),
            mintemp_c: z.number(),
            maxtemp_f: z.number(),
            mintemp_f: z.number(),
            daily_chance_of_rain: z.number(),
            condition: z.object({ text: z.string(), code: z.number().int() }),
          }),
        }),
      )
      .min(1),
  }),
});

export interface WeatherService {
  getForecast(lat: number, lon: number): Promise<ForecastResponse>;
  searchLocations(query: string): Promise<Location[]>;
}

interface WeatherApiOptions {
  apiKey: string;
  fetchFn?: FetchFn;
  ttlMs?: number;
  maxEntries?: number;
  /** Place names barely change, so searches are kept much longer than forecasts. */
  searchTtlMs?: number;
  now?: () => number;
}

/** 2 decimals is about 1 km: nearby requests share a cache entry and an upstream call. */
const round2 = (n: number) => Math.round(n * 100) / 100;

export function createWeatherApi({
  apiKey,
  fetchFn,
  ttlMs = 30 * 60 * 1000,
  maxEntries = 200,
  searchTtlMs = 24 * 60 * 60 * 1000,
  now,
}: WeatherApiOptions): WeatherService {
  const clock = now ? { now } : {};
  const cache = new TtlCache<string, ForecastResponse>({ ttlMs, maxEntries, ...clock });
  const searchCache = new TtlCache<string, Location[]>({ ttlMs: searchTtlMs, maxEntries: 500, ...clock });

  const search = async (query: string): Promise<Location[]> => {
    const url = new URL(SEARCH_URL);
    url.search = new URLSearchParams({ key: apiKey, q: query }).toString();
    const results = await fetchJson(url, {
      upstream: "WeatherAPI",
      schema: UpstreamSearchSchema,
      ...(fetchFn ? { fetchFn } : {}),
    });
    return results
      .map(({ name, region, country, lat, lon }) => ({
        name: name.trim().slice(0, 100),
        region: region.trim().slice(0, 100),
        country: country.trim().slice(0, 100),
        lat,
        lon,
      }))
      .filter((place, index, all) => {
        if (!place.name || !place.country) return false;
        // WeatherAPI sometimes lists one town twice with slightly different coordinates.
        const id = `${place.name}|${place.region}|${place.country}`.toLowerCase();
        return all.findIndex((other) => `${other.name}|${other.region}|${other.country}`.toLowerCase() === id) === index;
      })
      .slice(0, LOCATION_SEARCH_MAX_RESULTS);
  };

  const load = async (lat: number, lon: number): Promise<ForecastResponse> => {
    const url = new URL(FORECAST_URL);
    url.search = new URLSearchParams({
      key: apiKey,
      q: `${String(lat)},${String(lon)}`,
      days: String(FORECAST_DAYS),
      aqi: "no",
      alerts: "no",
    }).toString();

    const data = await fetchJson(url, {
      upstream: "WeatherAPI",
      schema: UpstreamForecastSchema,
      ...(fetchFn ? { fetchFn } : {}),
    });

    return {
      days: data.forecast.forecastday.slice(0, FORECAST_DAYS).map(({ date, day }) => ({
        date,
        condition: toCondition(day.condition.code),
        label: day.condition.text.trim(),
        highC: Math.round(day.maxtemp_c),
        lowC: Math.round(day.mintemp_c),
        highF: Math.round(day.maxtemp_f),
        lowF: Math.round(day.mintemp_f),
        chanceOfRain: Math.min(100, Math.max(0, Math.round(day.daily_chance_of_rain))),
      })),
    };
  };

  return {
    getForecast(lat, lon) {
      const [rLat, rLon] = [round2(lat), round2(lon)];
      return cache.getOrLoad(`${String(rLat)},${String(rLon)}`, () => load(rLat, rLon));
    },
    searchLocations(query) {
      // "Paris", "paris " and "PARIS" are one search.
      const key = query.trim().toLowerCase().replace(/\s+/g, " ");
      return searchCache.getOrLoad(key, () => search(key));
    },
  };
}
