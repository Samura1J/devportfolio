# Portfolio TypeScript Rewrite Plan

The rewrite lives in a **new folder**. The existing `devportfolio` repo is reference only and is not modified.

Deployment (Docker, nginx, server scripts) is out of scope for now.

## Current site (reference)

| App | Stack | Path |
|---|---|---|
| Portfolio | React 19, Vite, Tailwind 4, JSX | `/` |
| Weather app | React with the 7timer API and a CSV city list | `/projects/weatherappv2` |
| Seat picker | React with react-router and Stripe Checkout | `/projects/seatpicker` |
| Seat picker API | Express 5 (CommonJS) with TMDB and Stripe | `/api/v1/*` |

## Target structure (npm workspaces)

```
apps/
  portfolio/        React + TS
  weather/          React + TS (WeatherAPI.com)
  seatpicker/       React + TS
  api/              Express + TS (seat picker + weather proxy)
packages/
  shared/           types and zod schemas shared by frontend and backend
  tsconfig/         base tsconfig with strict: true
```

Keep the existing URL paths (`/`, `/projects/weatherappv2`, `/projects/seatpicker`, `/api/v1`).

## Assets to copy from the old repo

- `public/*.png`: portfolio images, project previews, GitHub and LinkedIn icons, favicon
- `reactWeatherApp/public/images/*.svg`: the 16 weather icons
- `seatpicker/public/*.png`: movie posters
- `reactWeatherApp/public/city_coordinates.csv`: convert it to `cities.ts`, or drop it (see Phase 2)
- The text and links in `src/Content.jsx`

---

## Phase 0: Groundwork

- Root `package.json` with npm workspaces.
- `packages/tsconfig`: base config with `strict` and `noUncheckedIndexedAccess`.
- One flat ESLint config using `typescript-eslint`.
- Scripts in every app: `dev`, `build`, `typecheck`, `lint`.
- Vitest for unit tests.
- In each frontend's `vite.config.ts`:
  - Set `base` to the app's subpath.
  - Proxy `/api` to the local API server for development.

## Phase 1: Portfolio

- Write all components in `.tsx` and type the props and refs (`RefObject<HTMLElement>`).
- Turn the project cards into a typed `projects: Project[]` array that `Content` maps over.
- Render a single `Sidebar` with responsive styling instead of two copies.
- Make the nav items `<button>`s instead of clickable `<div>`s.
- Give every image `alt` text.
- Change the weather card description to say WeatherAPI instead of 7timer.

## Phase 2: Weather app (WeatherAPI.com)

### Backend proxy (required)
WeatherAPI needs an API key, so all calls go through `apps/api` to keep the key out of the browser.

```
GET /api/v1/weather?lat=52.367&lon=4.904
  -> https://api.weatherapi.com/v1/forecast.json?key=KEY&q=52.367,4.904&days=N
```

- Read the key from the `WEATHERAPI_KEY` env var.
- Cache responses in memory per location for about 30 minutes.
- Validate the upstream response with zod and return a normalized shape.

### Forecast length
The free plan likely returns only **3 days**. Check your plan, and size the layout to match (3 cards instead of `lg:grid-cols-7`, or add hourly data).

### Shared type

```ts
// packages/shared
type Condition =
  | 'clear' | 'pcloudy' | 'cloudy' | 'mcloudy' | 'fog'
  | 'lightrain' | 'rain' | 'ishower' | 'oshower' | 'rainsnow'
  | 'lightsnow' | 'snow' | 'tstorm' | 'tsrain' | 'windy' | 'humid';

interface DailyForecast {
  date: string;           // forecastday[].date, e.g. "2026-11-14"
  condition: Condition;   // mapped from day.condition.code
  label: string;          // day.condition.text
  highC: number; lowC: number;  // day.maxtemp_c / mintemp_c
  highF: number; lowF: number;  // day.maxtemp_f / mintemp_f
}
```

The API returns both °C and °F and gives ISO dates, so `convertToF` and the substring date parsing can go.

### Condition codes mapped to the existing icons
Verify these against WeatherAPI's official `weather_conditions.json` before finalizing.

| Icon | WeatherAPI codes |
|---|---|
| clear | 1000 |
| pcloudy | 1003 |
| cloudy | 1006 |
| mcloudy | 1009 |
| fog | 1030, 1135, 1147 |
| lightrain | 1063, 1150–1153, 1180–1183 |
| rain | 1186–1195 |
| ishower | 1240 |
| oshower | 1243–1246 |
| rainsnow | 1069, 1072, 1168–1171, 1198–1207, 1249–1252 |
| lightsnow | 1066, 1210–1213, 1255 |
| snow | 1114, 1117, 1216–1237, 1258–1264 |
| tstorm | 1087 |
| tsrain | 1273–1282 |

- Fall back to `cloudy` for any unmapped code.
- `windy` and `humid` have no code. Either derive them from `maxwind_kph` or `avghumidity`, or drop them.

### Frontend
- City selection, two options:
  - **A.** A typed `cities.ts` (lat, lon, name, country) converted from the CSV, used for the dropdown.
  - **B.** A search box backed by WeatherAPI's `search.json`, proxied as `/api/v1/weather/search?q=`, replacing the fixed list.
- A typed `'C' | 'F'` unit toggle.
- Loading, error and empty states.
- Pick the icon from the `condition` field.

## Phase 3: Seat picker API

- ESM and TypeScript. Use `tsx` for development and `tsc` for the build (no nodemon).
- A typed config module that reads env vars and fails fast when one is missing:
  - `TMDB_API_KEY`
  - `STRIPE_API_KEY`
  - `WEATHERAPI_KEY`
  - `PUBLIC_URL`
- Validate request bodies with zod schemas from `packages/shared`.
- Fixes compared to the old backend:
  - Build the Stripe `success_url` and `cancel_url` from `PUBLIC_URL`. The old code used the internal hostname `main-frontend`.
  - Reuse one Stripe price ID instead of creating a new product and price on every checkout.
  - Handle errors from TMDB, and return typed `Movie[]`.
  - Remove the CORS config if the frontend and API share an origin.
  - Validate seat IDs on the server instead of only counting them.

## Phase 4: Seat picker frontend

- A seat ID type such as `` `${number}${'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'}` ``, with the seat map built by a typed function.
- Keep the selection somewhere a refresh can't erase it, in a context or the URL (`?movie=123&seats=1A,1B`), not only in `location.state`.
- Pass the movie `id` instead of the title.
- Make `/success` and `/cancel` real routes (the old `success.html` and `cancel.html` weren't wired up).
- Use shared types for the `Movie` and checkout request and response.
- Remove debug `console.log`s and dead commented-out code.

## Suggested order

1. Phase 0: groundwork
2. Phase 1: portfolio (mechanical, low risk)
3. Phase 3: API (both apps need it)
4. Phase 2: weather app (new API, highest risk)
5. Phase 4: seat picker frontend

Deployment comes later, as a separate plan.
