import type { CheckoutSummary, ContactRequest, ForecastResponse, Location, Movie } from "@portfolio/shared";
import { vi } from "vitest";
import type { AppDeps } from "../app";
import { createApp } from "../app";
import type { CheckoutGateway, CreateSessionInput } from "../clients/checkout";
import type { Mailer } from "../clients/mailer";
import type { MovieCatalog } from "../clients/tmdb";
import type { WeatherService } from "../clients/weatherapi";
import { loadConfig, type Config } from "../config";

export const MOVIES: Movie[] = [
  { id: 101, title: "Future City", posterUrl: "https://image.tmdb.org/t/p/w500/a.jpg" },
  { id: 202, title: "Prank War", posterUrl: "https://image.tmdb.org/t/p/w500/b.jpg" },
];

export function testConfig(overrides: Partial<Config> = {}): Config {
  return { ...loadConfig({ NODE_ENV: "test", PUBLIC_URL: "https://example.test" }), ...overrides };
}

export function fakeCatalog(movies: Movie[] = MOVIES): MovieCatalog {
  return {
    listMovies: vi.fn(() => Promise.resolve(movies)),
    findMovie: vi.fn((id: number) => Promise.resolve(movies.find((m) => m.id === id))),
  };
}

export const SUMMARY: CheckoutSummary = {
  status: "complete",
  paid: true,
  movieTitle: "Future City",
  seats: ["1A", "1B"],
  amountTotalCents: 2400,
  currency: "usd",
};

/**
 * A Stripe stand-in. Each session gets a new id; `paid` lists the session ids
 * that count as paid when expired or looked up.
 */
export function fakeGateway(paid = new Set<string>()) {
  let count = 0;
  const createSession = vi.fn((_input: CreateSessionInput) => {
    count += 1;
    const id = `cs_test_${String(count)}`;
    return Promise.resolve({ id, url: `https://checkout.stripe.com/c/pay/${id}` });
  });
  const getSummary = vi.fn((_id: string) => Promise.resolve(SUMMARY));
  const expireSession = vi.fn((id: string) => Promise.resolve({ paid: paid.has(id) }));
  const gateway: CheckoutGateway = { createSession, getSummary, expireSession };
  return { gateway, createSession, getSummary, expireSession, paid };
}

export function fakeMailer() {
  const sendContact = vi.fn((_message: ContactRequest) => Promise.resolve());
  const mailer: Mailer = { sendContact };
  return { mailer, sendContact };
}

export const FORECAST: ForecastResponse = {
  days: [
    { date: "2026-11-15", condition: "lightrain", label: "Patchy rain nearby", highC: 9, lowC: 2, highF: 49, lowF: 35, chanceOfRain: 53 },
  ],
};

export const PLACES: Location[] = [
  { name: "Amsterdam", region: "North Holland", country: "Netherlands", lat: 52.37, lon: 4.89 },
];

export function fakeWeather() {
  const getForecast = vi.fn((_lat: number, _lon: number) => Promise.resolve(FORECAST));
  const searchLocations = vi.fn((_query: string) => Promise.resolve(PLACES));
  const weather: WeatherService = { getForecast, searchLocations };
  return { weather, getForecast, searchLocations };
}

/** An app with every feature wired to fakes; override any dep per test. */
export function testApp(deps: Partial<AppDeps> = {}) {
  return createApp({
    config: testConfig(),
    movies: fakeCatalog(),
    checkout: fakeGateway().gateway,
    mailer: fakeMailer().mailer,
    weather: fakeWeather().weather,
    ...deps,
  });
}
