import { CONDITIONS, ForecastResponseSchema } from "@portfolio/shared";
import { describe, expect, it, vi } from "vitest";
import { UpstreamError } from "../lib/errors";
import { CODE_TO_CONDITION, toCondition } from "./conditions";
import officialConditions from "./fixtures/weather_conditions.json";
import { createWeatherApi } from "./weatherapi";

describe("condition codes", () => {
  it("maps every code in WeatherAPI's official list", () => {
    const unmapped = officialConditions.filter(({ code }) => !CODE_TO_CONDITION.has(code));
    expect(unmapped).toEqual([]);
    expect(CODE_TO_CONDITION.size).toBe(officialConditions.length);
  });

  it("uses every icon at least once", () => {
    expect(new Set(CODE_TO_CONDITION.values())).toEqual(new Set(CONDITIONS));
  });

  it("spot-checks a few codes and falls back to cloudy", () => {
    expect(toCondition(1000)).toBe("clear");
    expect(toCondition(1063)).toBe("lightrain");
    expect(toCondition(1276)).toBe("tsrain");
    expect(toCondition(9999)).toBe("cloudy");
  });
});

const day = (date: string, code: number, text = "Sunny") => ({
  date,
  date_epoch: 0,
  day: {
    maxtemp_c: 9.4,
    mintemp_c: 1.6,
    maxtemp_f: 48.9,
    mintemp_f: 34.9,
    daily_chance_of_rain: 53,
    condition: { text: `${text} `, code, icon: "//cdn/64x64/day/113.png" },
  },
  hour: [],
});

const upstream = {
  location: { name: "De Wallen", country: "Netherlands" },
  forecast: {
    forecastday: [day("2026-11-15", 1063, "Patchy rain nearby"), day("2026-11-16", 1000), day("2026-11-17", 1279)],
  },
};

const okFetch = () => vi.fn((_url: string | URL | Request, _init?: RequestInit) => Promise.resolve(Response.json(upstream)));

describe("WeatherAPI client", () => {
  it("normalizes the forecast", async () => {
    const weather = createWeatherApi({ apiKey: "k", fetchFn: okFetch() });
    const result = await weather.getForecast(52.367, 4.904);

    expect(ForecastResponseSchema.parse(result)).toEqual(result);
    expect(result.days).toHaveLength(3);
    expect(result.days[0]).toEqual({
      date: "2026-11-15",
      condition: "lightrain",
      label: "Patchy rain nearby",
      highC: 9,
      lowC: 2,
      highF: 49,
      lowF: 35,
      chanceOfRain: 53,
    });
    expect(result.days.map((d) => d.condition)).toEqual(["lightrain", "clear", "tsrain"]);
  });

  it("rounds coordinates to 2 decimals, so nearby requests share one upstream call", async () => {
    const fetchFn = okFetch();
    const weather = createWeatherApi({ apiKey: "secret", fetchFn });

    await weather.getForecast(52.3671, 4.9041);
    await weather.getForecast(52.3699, 4.9001);
    expect(fetchFn).toHaveBeenCalledOnce();

    const target = fetchFn.mock.calls[0]?.[0] ?? "";
    const url = new URL(target instanceof Request ? target.url : target);
    expect(url.origin + url.pathname).toBe("https://api.weatherapi.com/v1/forecast.json");
    expect(url.searchParams.get("q")).toBe("52.37,4.9");
    expect(url.searchParams.get("days")).toBe("3");
    expect(url.searchParams.get("key")).toBe("secret");
  });

  it("refetches after the 30-minute cache expires", async () => {
    let now = 0;
    const fetchFn = okFetch();
    const weather = createWeatherApi({ apiKey: "k", fetchFn, now: () => now });

    await weather.getForecast(1, 1);
    now = 30 * 60 * 1000;
    await weather.getForecast(1, 1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("turns a bad key into an UpstreamError", async () => {
    const fetchFn = () =>
      Promise.resolve(Response.json({ error: { code: 2006, message: "API key is invalid." } }, { status: 401 }));
    const weather = createWeatherApi({ apiKey: "bad", fetchFn });
    await expect(weather.getForecast(1, 1)).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe("WeatherAPI location search", () => {
  const results = [
    { id: 3332210, name: "Amsterdam ", region: "North Holland", country: "Netherlands", lat: 52.37, lon: 4.89, url: "a" },
    { id: 2615343, name: "Amsterdam", region: "", country: "United States of America", lat: 42.94, lon: -74.19, url: "b" },
    { id: 1, name: "", region: "", country: "Nowhere", lat: 0, lon: 0, url: "c" },
    { id: 2615344, name: "AMSTERDAM", region: "", country: "United States of America", lat: 42.95, lon: -74.2, url: "b2" },
    ...Array.from({ length: 6 }, (_, i) => ({ id: 10 + i, name: `Town ${String(i)}`, region: "", country: "X", lat: i, lon: i, url: "d" })),
  ];
  const searchFetch = () =>
    vi.fn((_url: string | URL | Request, _init?: RequestInit) => Promise.resolve(Response.json(results)));

  it("keeps the fields we use, drops nameless places and caps the list", async () => {
    const weather = createWeatherApi({ apiKey: "k", fetchFn: searchFetch() });
    const places = await weather.searchLocations("amsterdam");
    expect(places).toHaveLength(5);
    expect(places[0]).toEqual({ name: "Amsterdam", region: "North Holland", country: "Netherlands", lat: 52.37, lon: 4.89 });
    expect(places.some((p) => p.country === "Nowhere")).toBe(false);
    expect(places.filter((p) => p.country === "United States of America")).toHaveLength(1); // duplicate dropped
  });

  it("treats case and spacing variants as one cached search", async () => {
    const fetchFn = searchFetch();
    const weather = createWeatherApi({ apiKey: "k", fetchFn });
    await weather.searchLocations("New  York");
    await weather.searchLocations(" new york ");
    expect(fetchFn).toHaveBeenCalledOnce();

    const target = fetchFn.mock.calls[0]?.[0] ?? "";
    const url = new URL(target instanceof Request ? target.url : target);
    expect(url.pathname).toBe("/v1/search.json");
    expect(url.searchParams.get("q")).toBe("new york");
  });
});
