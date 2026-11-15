import { createApp } from "./app";
import { createStripeGateway } from "./clients/checkout";
import { createResendMailer } from "./clients/mailer";
import { createTmdbCatalog } from "./clients/tmdb";
import { createWeatherApi } from "./clients/weatherapi";
import { ConfigError, disabledFeatures, loadConfig, type Config } from "./config";

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

const app = createApp({
  config,
  movies: config.tmdbReadToken ? createTmdbCatalog({ readToken: config.tmdbReadToken }) : undefined,
  checkout: config.stripeSecretKey ? createStripeGateway(config.stripeSecretKey) : undefined,
  mailer: config.contact
    ? createResendMailer({ apiKey: config.contact.resendApiKey, to: config.contact.to, from: config.contact.from })
    : undefined,
  weather: config.weatherApiKey ? createWeatherApi({ apiKey: config.weatherApiKey }) : undefined,
});

const off = disabledFeatures(config);
if (off.length > 0) console.warn(`Not configured (routes answer 503): ${off.join(", ")}`);

app.listen(config.port, config.host, (error) => {
  if (error) throw error;
  console.log(`API (${config.env}) listening at http://${config.host}:${String(config.port)}`);
});
