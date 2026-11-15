import {
  LocationSearchQuerySchema,
  WeatherQuerySchema,
  type ForecastResponse,
  type Location,
} from "@portfolio/shared";
import { Router } from "express";
import type { WeatherService } from "../clients/weatherapi";
import { notConfigured, parseInput } from "../lib/errors";
import { rateLimit, type RateLimitOptions } from "../lib/rateLimit";

interface WeatherDeps {
  weather: WeatherService | undefined;
  /**
   * One budget for forecasts and searches, guarding the WeatherAPI quota
   * against sweeps that miss the cache. A search fires per pause in typing,
   * so a few cities' worth of searching is a few dozen requests.
   */
  limit?: RateLimitOptions | undefined;
}

export function weatherRouter({ weather, limit }: WeatherDeps): Router {
  const router = Router();
  const limiter = rateLimit(limit ?? { limit: 300, windowMs: 15 * 60 * 1000 });

  router.get("/weather/search", limiter, async (req, res) => {
    if (!weather) throw notConfigured("Weather");
    const { q } = parseInput(LocationSearchQuerySchema, req.query);
    const body: Location[] = await weather.searchLocations(q);
    res.json(body);
  });

  router.get("/weather", limiter, async (req, res) => {
    if (!weather) throw notConfigured("Weather");
    const { lat, lon } = parseInput(WeatherQuerySchema, req.query);
    const body: ForecastResponse = await weather.getForecast(lat, lon);
    res.json(body);
  });

  return router;
}
