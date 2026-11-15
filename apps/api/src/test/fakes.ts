import type { CheckoutSummary, ContactRequest, Movie } from "@portfolio/shared";
import { vi } from "vitest";
import type { AppDeps } from "../app";
import { createApp } from "../app";
import type { CheckoutGateway, CreateSessionInput } from "../clients/checkout";
import type { Mailer } from "../clients/mailer";
import type { MovieCatalog } from "../clients/tmdb";
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

export function fakeGateway() {
  const createSession = vi.fn((_input: CreateSessionInput) =>
    Promise.resolve({ url: "https://checkout.stripe.com/c/pay/cs_test_123" }),
  );
  const getSummary = vi.fn((_id: string) => Promise.resolve(SUMMARY));
  const gateway: CheckoutGateway = { createSession, getSummary };
  return { gateway, createSession, getSummary };
}

export function fakeMailer() {
  const sendContact = vi.fn((_message: ContactRequest) => Promise.resolve());
  const mailer: Mailer = { sendContact };
  return { mailer, sendContact };
}

/** An app with every feature wired to fakes; override any dep per test. */
export function testApp(deps: Partial<AppDeps> = {}) {
  return createApp({
    config: testConfig(),
    movies: fakeCatalog(),
    checkout: fakeGateway().gateway,
    mailer: fakeMailer().mailer,
    ...deps,
  });
}
