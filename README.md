# Corey Joseph · Portfolio

My portfolio site and two of its demo projects, rewritten in TypeScript as one npm workspace.

| App | Path in production | Dev port | What it is |
|---|---|---|---|
| `apps/portfolio` | `/` | 5173 | The portfolio: projects, case studies, stack and contact form |
| `apps/weather` | `/projects/weatherappv2/` | 5174 | Three-day forecast with place search |
| `apps/seatpicker` | `/projects/seatpicker/` | 5175 | Pick a movie and seats, then pay with Stripe Checkout (test mode) |
| `apps/api` | `/api/v1/*` | 3000 | Express API for all three: movies, checkout and seat holds, weather, contact |

There are also three shared packages:

- `packages/shared`: zod schemas, types and constants used by both the browser and the API. One example is the ticket price, so the total a buyer sees and the amount charged always match.
- `packages/ui`: the design system, with the Tailwind 4 theme, fonts, components and the dark/light toggle.
- `packages/tsconfig`: the base TypeScript configs.

Stack: React 19, Vite 8, Tailwind 4, React Router 7, Express 5, zod 4, Stripe, SQLite (`node:sqlite`), Vitest, ESLint (`strictTypeChecked`).

## Setup

You need **Node 22.12 or newer** (`.nvmrc` pins 22).

```bash
npm install
```

```bash
cp apps/api/.env.example apps/api/.env
```

Then fill in `apps/api/.env` (see [Environment variables](#environment-variables)). Every key is optional in development. If a key is missing, only that feature is turned off: its routes answer 503 and its page shows a friendly error. The API lists the features that are off when it starts.

## Running it

```bash
npm run dev
```

This starts the API and the three Vite dev servers together. Open **http://localhost:5173**. The portfolio's dev server proxies `/api` and both demo apps, so everything shares one origin, like production, and the links between apps work.

| Command | What it does |
|---|---|
| `npm run dev` | API plus all three apps with hot reload |
| `npm run build` | Builds every workspace: three `dist/` folders of static files and `apps/api/dist/index.js` |
| `npm run preview` | Runs the **built** output (`vite preview` for each app and `node` for the API) on the same single origin, at http://localhost:5173. Run `npm run build` first. |
| `npm run check` | Typecheck, lint and tests: what must pass before a commit |
| `npm test` | All Vitest projects (API, shared, ui and the three apps) |
| `npm run dev -w @portfolio/weather` | One app on its own (here the weather app at http://localhost:5174/projects/weatherappv2/) |

## Environment variables

Only the API reads environment variables, from `apps/api/.env`. The Node flag `--env-file-if-exists` loads it, so there's no dotenv dependency. The frontends have no secrets and no build-time variables; they call `/api/v1` on their own origin.

| Variable | Needed for | Notes |
|---|---|---|
| `NODE_ENV` | | `development` by default. In `production`, the four keys marked **prod** are required, or the API refuses to start. |
| `API_PORT`, `HOST` | | `3000` and `127.0.0.1` by default |
| `PUBLIC_URL` | Checkout (**prod**) | The origin visitors use. Stripe redirects back here. Defaults to `http://localhost:5173`. |
| `TMDB_READ_TOKEN` | Movies (**prod**) | TMDB's long *API Read Access Token* (a JWT), not the short v3 key |
| `STRIPE_SECRET_KEY` | Checkout (**prod**) | Outside production it must be a test key (`sk_test_` or `rk_test_`); a live key is rejected |
| `STRIPE_WEBHOOK_SECRET` | Payment webhooks | Optional (`whsec_…`). See below. |
| `SEAT_DB_PATH` | Seat holds | SQLite file, relative to `apps/api`. Defaults to `data/seats.db`, which git ignores. |
| `WEATHERAPI_KEY` | Weather (**prod**) | From weatherapi.com |
| `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM` | Contact form | Optional everywhere. Without them, the form says the message couldn't be sent and links to LinkedIn instead. |

### Trying a payment

Checkout always runs in Stripe test mode and takes cards only (wallets like Apple Pay and Google Pay included), since those settle at once. Pay with card `4242 4242 4242 4242`, any future expiry date and any CVC.

Webhooks are optional. Without them, a payment is confirmed when the buyer reaches the success page, or when the seat hold expires (the API then asks Stripe). To receive real webhooks locally, run the [Stripe CLI](https://docs.stripe.com/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
```

Put the `whsec_…` secret it prints in `STRIPE_WEBHOOK_SECRET`, then restart the API.

### Double-booking protection

Starting a checkout holds the seats in SQLite for the life of the Stripe session (31 minutes). Anyone else trying for those seats gets a 409 that names them, and the seat map marks taken seats. Holds belong to the browser, through a random id in an HttpOnly `seat_visitor` cookie. Two tabs in the same browser are one buyer, so the newer checkout replaces the older one; people on a shared network (an office, a campus) don't affect each other. One IP address can have at most 5 checkouts open at once, so clearing cookies can't be used to hold the whole theater. Each movie starts the day (UTC) with an empty theater.

## Project notes

- `build-plan.md` is the phase-by-phase build log, with the decisions behind each phase.
- `typescript-rewrite-plan.md` is the original rewrite plan.
- `DEPLOYMENT.md` lists what a server needs: static paths, the SPA fallback, the API proxy and the seats database.
- `design/` holds the design mockups the portfolio was built from.
