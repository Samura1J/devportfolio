import { z } from "zod";

/** Treats unset and empty-string env vars the same: missing. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const EnvSchema = z
  .object({
    NODE_ENV: optional(z.enum(["development", "test", "production"])).default("development"),
    API_PORT: optional(z.coerce.number().int().min(1).max(65535)).default(3000),
    HOST: optional(z.string()).default("127.0.0.1"),
    /** Origin the browser sees; used for Stripe return URLs. */
    PUBLIC_URL: optional(z.url({ protocol: /^https?$/ })),
    TMDB_READ_TOKEN: optional(z.string()),
    STRIPE_SECRET_KEY: optional(
      z.string().regex(/^(sk|rk)_(test|live)_/, "must be a Stripe secret key (sk_… or rk_…)"),
    ),
    /** Signing secret of the Stripe webhook endpoint (whsec_…). Optional: without it, holds resolve when they expire. */
    STRIPE_WEBHOOK_SECRET: optional(z.string().regex(/^whsec_/, "must be a Stripe webhook signing secret (whsec_…)")),
    /** SQLite file for seat holds and sales. */
    SEAT_DB_PATH: optional(z.string()).default("data/seats.db"),
    WEATHERAPI_KEY: optional(z.string()),
    RESEND_API_KEY: optional(z.string()),
    CONTACT_TO: optional(z.email()),
    CONTACT_FROM: optional(z.string()).default("Portfolio <onboarding@resend.dev>"),
  })
  .superRefine((env, ctx) => {
    const production = env.NODE_ENV === "production";
    if (!production && env.STRIPE_SECRET_KEY?.includes("_live_")) {
      ctx.addIssue({
        code: "custom",
        path: ["STRIPE_SECRET_KEY"],
        message: "is a live key; use a test key outside production",
      });
    }
    if (!production) return;
    for (const key of ["PUBLIC_URL", "TMDB_READ_TOKEN", "STRIPE_SECRET_KEY", "WEATHERAPI_KEY"] as const) {
      if (env[key] === undefined) ctx.addIssue({ code: "custom", path: [key], message: "is required in production" });
    }
  });

export interface Config {
  env: "development" | "test" | "production";
  port: number;
  host: string;
  publicUrl: string;
  tmdbReadToken: string | undefined;
  stripeSecretKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  seatDbPath: string;
  weatherApiKey: string | undefined;
  contact: { resendApiKey: string; to: string; from: string } | undefined;
}

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid environment:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "ConfigError";
  }
}

/**
 * Reads and validates the environment once at startup. Production requires
 * every service key; in development a missing key only disables its routes
 * (they answer 503), so you can work on one app without every credential.
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((issue) => `${issue.path.join(".") || "env"} ${issue.message}`),
    );
  }
  const env = parsed.data;
  return {
    env: env.NODE_ENV,
    port: env.API_PORT,
    host: env.HOST,
    publicUrl: (env.PUBLIC_URL ?? "http://localhost:5173").replace(/\/+$/, ""),
    tmdbReadToken: env.TMDB_READ_TOKEN,
    stripeSecretKey: env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    seatDbPath: env.SEAT_DB_PATH,
    weatherApiKey: env.WEATHERAPI_KEY,
    contact:
      env.RESEND_API_KEY && env.CONTACT_TO
        ? { resendApiKey: env.RESEND_API_KEY, to: env.CONTACT_TO, from: env.CONTACT_FROM }
        : undefined,
  };
}

/** Human-readable list of disabled features, for the startup log. */
export function disabledFeatures(config: Config): string[] {
  const off: string[] = [];
  if (!config.tmdbReadToken) off.push("movies (TMDB_READ_TOKEN)");
  if (!config.stripeSecretKey) off.push("checkout (STRIPE_SECRET_KEY)");
  else if (!config.stripeWebhookSecret) {
    off.push("payment webhooks (STRIPE_WEBHOOK_SECRET); paid seats are confirmed on the success page or when holds expire");
  }
  if (!config.weatherApiKey) off.push("weather (WEATHERAPI_KEY)");
  if (!config.contact) off.push("contact (RESEND_API_KEY + CONTACT_TO)");
  return off;
}
