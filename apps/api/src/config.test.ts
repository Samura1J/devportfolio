import { describe, expect, it } from "vitest";
import { ConfigError, disabledFeatures, loadConfig } from "./config";

function problems(env: NodeJS.ProcessEnv): string[] {
  try {
    loadConfig(env);
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
    throw error;
  }
  return [];
}

describe("loadConfig", () => {
  it("starts in development with only defaults", () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      env: "development",
      port: 3000,
      host: "127.0.0.1",
      publicUrl: "http://localhost:5173",
      stripeSecretKey: undefined,
      contact: undefined,
    });
    expect(disabledFeatures(config)).toHaveLength(4);
  });

  it("reads API_PORT (not PORT) and trims a trailing slash from PUBLIC_URL", () => {
    const config = loadConfig({ API_PORT: "4100", PORT: "5173", PUBLIC_URL: "https://coreyjoseph.me/" });
    expect(config.port).toBe(4100);
    expect(config.publicUrl).toBe("https://coreyjoseph.me");
  });

  it("treats empty strings as missing", () => {
    expect(loadConfig({ STRIPE_SECRET_KEY: "", API_PORT: "" })).toMatchObject({
      stripeSecretKey: undefined,
      port: 3000,
    });
  });

  it("lists every missing key in production at once", () => {
    expect(problems({ NODE_ENV: "production" })).toEqual([
      "PUBLIC_URL is required in production",
      "TMDB_READ_TOKEN is required in production",
      "STRIPE_SECRET_KEY is required in production",
      "WEATHERAPI_KEY is required in production",
    ]);
  });

  it("refuses a live Stripe key outside production", () => {
    expect(problems({ STRIPE_SECRET_KEY: "sk_live_abc" })).toEqual([
      "STRIPE_SECRET_KEY is a live key; use a test key outside production",
    ]);
    expect(problems({ STRIPE_SECRET_KEY: "pk_test_abc" })[0]).toMatch(/^STRIPE_SECRET_KEY must be a Stripe secret key/);
  });

  it("enables contact only when both the key and recipient are set", () => {
    expect(loadConfig({ RESEND_API_KEY: "re_123" }).contact).toBeUndefined();
    expect(loadConfig({ RESEND_API_KEY: "re_123", CONTACT_TO: "me@example.com" }).contact).toEqual({
      resendApiKey: "re_123",
      to: "me@example.com",
      from: "Portfolio <onboarding@resend.dev>",
    });
  });

  it("rejects malformed values", () => {
    expect(problems({ API_PORT: "99999", PUBLIC_URL: "ftp://x" })).toHaveLength(2);
  });
});
