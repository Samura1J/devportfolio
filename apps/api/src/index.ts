import { createApp } from "./app";
import { createStripeGateway, createWebhookVerifier } from "./clients/checkout";
import { createResendMailer } from "./clients/mailer";
import { createTmdbCatalog } from "./clients/tmdb";
import { createWeatherApi } from "./clients/weatherapi";
import { ConfigError, disabledFeatures, loadConfig, type Config } from "./config";
import { createBookings } from "./seats/bookings";
import { openSeatStore } from "./seats/store";

function readConfig(): Config {
  try {
    return loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

const config = readConfig();

const checkout = config.stripeSecretKey ? createStripeGateway(config.stripeSecretKey) : undefined;
const bookings = checkout ? createBookings({ store: openSeatStore(config.seatDbPath), gateway: checkout }) : undefined;

const app = createApp({
  config,
  movies: config.tmdbReadToken ? createTmdbCatalog({ readToken: config.tmdbReadToken }) : undefined,
  checkout,
  bookings,
  verifyWebhook: config.stripeWebhookSecret ? createWebhookVerifier(config.stripeWebhookSecret) : undefined,
  mailer: config.contact
    ? createResendMailer({ apiKey: config.contact.resendApiKey, to: config.contact.to, from: config.contact.from })
    : undefined,
  weather: config.weatherApiKey ? createWeatherApi({ apiKey: config.weatherApiKey }) : undefined,
});

const off = disabledFeatures(config);
if (off.length > 0) console.warn(`Not configured (routes answer 503): ${off.join(", ")}`);

// Resolve expired seat holds and clear past showings every few minutes.
if (bookings) {
  setInterval(
    () => {
      bookings.sweep().catch((error: unknown) => {
        console.error("Seat sweep failed", error);
      });
    },
    5 * 60 * 1000,
  ).unref();
}

app.listen(config.port, config.host, (error) => {
  if (error) throw error;
  console.log(`API (${config.env}) listening at http://${config.host}:${String(config.port)}`);
});
