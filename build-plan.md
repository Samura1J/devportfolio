# Portfolio TypeScript Build Plan

Companion to `typescript-rewrite-plan.md`. Part 1 reviews that plan against the old code in `D:\devportfolio`. Part 2 turns it into ordered build steps, each with a clear "done when".

---

## Part 1: Review of the rewrite plan

The plan is sound: the structure, phase order and most of the fixes are right. These are the gaps and corrections I found by reading the old code.

### Corrections

| # | Plan says | Issue | Change |
|---|---|---|---|
| 1 | Copy `seatpicker/public/*.png` movie posters | The old frontend never uses them. Posters come from TMDB (`image.tmdb.org`). | Copy them only as a fallback for TMDB outages or `poster_path: null`, or drop them. |
| 2 | Config var `TMDB_API_KEY` | The old code sends it as `Authorization: Bearer`, so it is the TMDB **read access token**, not the v3 API key. The old variable was `API_KEY`. | Name it `TMDB_READ_TOKEN` to avoid pasting the wrong credential. |
| 3 | "Reuse one Stripe price ID" | No env var for the price ID in the config list, and a fixed price loses the movie title on the receipt. | Use inline `price_data` with `product_data.name = "Ticket: <title>"`. This creates no Stripe objects per checkout and needs no price ID. Keep the amount (1200 cents) in `packages/shared` so the frontend total and the backend charge cannot drift. |
| 4 | Seat ID type `` `${number}${'A'..'J'}` `` | It accepts `0A`, `11A`, `1.5A`. The type alone does not validate anything at runtime. | Zod schema `/^(10\|[1-9])[A-J]$/` in shared, with the TS type inferred from it. The server also dedupes and caps the count (e.g. max 10). |
| 5 | "Pass the movie id instead of the title" | If the server still trusts a client-sent title, nothing improves. | Checkout takes `{ movieId, seats }`. The server looks the title up in its cached TMDB list and rejects unknown ids. |
| 6 | Shared package, API built with `tsc` | `tsc` does not bundle, so the API's output would import `@portfolio/shared` as raw `.ts`, which Node won't run from `node_modules`. | Shared exports its `.ts` source (Vite and `tsx` both handle that). The API build uses `tsup` (bundles shared in), and `tsc --noEmit` remains the type check. Alternative: project references with shared emitting `dist`, which needs a watch step in dev. |
| 7 | Weather date handling "can go" | `new Date("2026-11-14")` parses as **UTC midnight**, so in US time zones it renders as the previous day. | Format with `timeZone: 'UTC'`, or build the date from its parts. Add a unit test. |
| 8 | `Condition` includes `windy`, `humid` | The old `weatherTypeTranslation` has no `windy` entry either. | Default: drop both from the union. Can be added later from `maxwind_kph` / `avghumidity`. Keep the label from `day.condition.text`. |

### Gaps (not in the plan)

- **No git repo yet.** `D:\portfolio-ts` is not a repository. Init one in step 0.1, with `.env` gitignored and a `.env.example`. Do not copy `seatpicker-backend/.env`.
- **Stripe test mode.** The config module should refuse a `sk_live_` key unless `NODE_ENV=production`.
- **`success_url`** should carry `?session_id={CHECKOUT_SESSION_ID}` so `/success` can show what was bought (optional `GET /api/v1/checkout/:id`).
- **Caching TMDB.** `/movies` hits TMDB on every request. Cache it for about 1 hour. Checkout validation (#5) needs this cache anyway.
- **Weather proxy input.** Validate `lat` in [-90, 90] and `lon` in [-180, 180]. Round both to 2 decimals for the cache key. Cap the cache size.
- **Upstream timeouts.** Wrap TMDB, WeatherAPI and Stripe calls in `AbortSignal.timeout(...)`, and map failures to 502 with a typed error body.
- **Dead dependencies** to leave out: `papaparse`, `react-select`, `@stripe/react-stripe-js`, `@stripe/stripe-js` (Checkout is a redirect), `cors`, `dotenv` (use `node --env-file` / `tsx --env-file`), `nodemon`.
- **Leftover CSS.** `topButton`, `sidebar-icon`, `seat`, `seatSelected` live in each app's `index.css`/`App.css` and must be ported. `reactWeatherApp/tailwind.config.js` is v3-style and Tailwind 4 ignores it, so delete it.
- **Old portfolio layout:** superseded by the new design (see Part 1b). The sidebar, hamburger and `offsetTop` scrolling are not ported.
- **Seat map quirk.** The old `seatingMap` is a sparse array starting at index 1, with an aisle break computed from `length - 5`. The typed builder should return `SeatId[][]` for rows 1–10 and put the aisle after row 5 explicitly.
- **Node version.** Pin it with `engines` and `.nvmrc` (current LTS).
- **Tests.** The plan names Vitest but not what to test. See step 0.5 and the tests in each phase.

### Condition-code table

I checked the table against WeatherAPI's code list from memory. All 48 codes are covered and the ranges are correct, with these notes:

- The codes go in steps of 3, so write them as explicit lists in a `Record<number, Condition>`, not as numeric ranges.
- 1279 and 1282 (snow with thunder) map to `tsrain`. That's acceptable.
- Still verify against the live `weather_conditions.json`. Commit it as a test fixture and add a test that every code in it maps to a condition.

### Decisions needed (defaults used below)

1. **City selection:** **A (typed `cities.ts`, 55 cities)** by default. It is deterministic, spends no API quota on search, and the "European cities" copy stays true. B can come later.
2. **Forecast length:** 3 days with a `grid-cols-1 md:grid-cols-3` layout. Hourly data is a later extra.
3. **API bundling:** `tsup` (see #6).
4. **Stripe pricing:** inline `price_data` (see #3).

---

## Part 1b: Review of `design/`

The files are a direction, not a spec: `corey_joseph_portfolio_design_system.md` ("Apex Engineering"), a desktop page, a mobile page, and two case-study modals. All are Tailwind v3 CDN mockups. The direction replaces the old portfolio entirely (sticky header, hero, project cards, stack, engagement section, contact form, footer), so Phase 1 below is rewritten around it.

### Design system issues to resolve when porting

| # | Issue | Change |
|---|---|---|
| D1 | **Token shape doubles every class.** Colors are `light-*` / `dark-*` pairs, so every element carries `bg-light-surface dark:bg-dark-surface`, and so on. | In Tailwind 4, define semantic tokens once in `@theme` (`--color-surface`, `--color-primary`, …) and redefine the CSS variables under `.dark`. Markup becomes `bg-surface text-on-surface`. That roughly halves the class strings and makes a missed `dark:` variant impossible. |
| D2 | **Secondary text fails contrast in dark mode.** `dark:text-dark-outline` (#334155 on #111827) is about 1.9:1. It is used for most captions, descriptions and the skills list. | Add an `on-surface-muted` token (e.g. #94A3B8 in dark, about 7:1) and keep `outline` for borders only. |
| D3 | **Small accent and success text is borderline in light mode.** `#0891B2` and `#059669` on white are under 4.5:1. They're used at 12px for eyebrows and skill levels. | Use darker shades for text in light mode (`cyan-700`, `emerald-700`), keep the brand values for fills and borders, and run an axe check in tests. |
| D4 | **Mono font not wired.** The spec names Source Code Pro, but the config has no `mono` family, so `font-mono` falls back to the system mono. | Add `--font-mono`. |
| D5 | **"Dark-mode-first" vs. light canvas.** The front matter says dark-first, while the overview and all mockups default to light. The toggle isn't persisted and ignores the OS setting. | Default to `prefers-color-scheme`, persist the choice in `localStorage`, and add an inline pre-paint script in `index.html` to avoid a flash. *Decision 5.* |
| D6 | **Material Symbols icon font.** It's a large variable font. Icon names show as text ("light_mode", "south") until it loads, and screen readers read them unless they have `aria-hidden`. | Use `react-icons` (already used) or `lucide-react`, which are tree-shaken SVGs. |
| D7 | **Google Fonts from the CDN.** | Self-host with `@fontsource/*` (Red Hat Text, Instrument Sans, Source Code Pro). This avoids the third-party request and keeps builds deterministic. |
| D8 | **`components/` sticker sheets** are referenced but missing. | Derive the components from the mockups instead (list in 1.3). |
| D9 | Spec says max width 1200px, mockups use `max-w-6xl` (1152px). Spec says "no heavy drop shadows", mockups use `shadow-sm` everywhere. | Minor. Pick one of each. Defaults: 1200px and no shadows. |
| D10 | **`animate-pulse`** on the availability dot and `scroll-smooth` on `<html>` ignore reduced-motion. | Wrap both in `motion-safe:`. |

### Structural and behavioral gaps

- **Desktop and mobile differ in structure.** Mobile drops the "engagement" section, adds a bottom tab bar, and uses shorter copy. Build one responsive page: top nav from `md:` up, bottom tab bar below (with `env(safe-area-inset-bottom)` padding and matching bottom padding on `<main>`). Give content fields an optional `short` variant instead of keeping two copies of the copy.
- **Case-study modals are separate pages** linking to `../portfolio-home/...`, which doesn't exist. Build them as a native `<dialog>` (focus trap, Esc to close, returns focus to the opening card) opened from a URL param (`/?case=weather`) so it can be deep-linked and the back button closes it. Don't use `/projects/<slug>`, because that path space belongs to the live apps.
- **The weather modal's "Next project"** links to the live seat picker instead of the next case study. Make prev/next switch the `case` param.
- **The contact form is a mock** (`alert(...)`). Real options: an API route that sends mail via a provider (Resend/Postmark) with zod validation, a honeypot field and per-IP rate limiting; or a `mailto:` link; or drop the form and keep the link cards. *Decision 6.*
- **The modal theme toggle** duplicates the header toggle. With a single page and a `<dialog>`, keep the one in the header.
- **Live links** are absolute `https://coreyjoseph.me/...` with `target="_blank"`. Use relative `/projects/...` paths so they work in dev too. In dev, proxy `/projects/weatherappv2` and `/projects/seatpicker` from the portfolio's Vite server to the other two dev servers (`ws: true`) so the whole site works on one origin, like production.
- **"Inspect Source Repository"** links to the GitHub profile, not a repo. Point it to this repo once it's public.
- **The footer year** is hard-coded to 2026. Compute it.
- **The weather and seat picker apps** aren't covered by the design. They'd look disconnected next to the new portfolio. Default: share the tokens and fonts through `packages/ui` and give each app a slim header with "← Portfolio" and the theme toggle. *Decision 7.*
- **Old assets:** `focused.png`, the project preview PNGs and the GitHub/LinkedIn PNG icons are unused in the new design (icons are inline SVG). Keep the preview PNGs as case-study screenshots if wanted. Otherwise only the favicon carries over.

### Content accuracy

The voice guide asks for "technically specific" copy, but much of the mockup copy describes features that don't exist. A hiring reviewer who opens the live app will notice. These need your review before launch (Phase 1 will use them as placeholders):

- **Weather:** says 7timer (now WeatherAPI) and React 18 (now React 19 + TS). "25+ EU hubs" (there are 55 cities), "3-hour cycles", "<180 ms", "Lighthouse 98", and the hourly/wind/cloud-cover code snippet are unmeasured or don't exist. The rewrite does make the "Full Stack Evolution" story true (Express proxy, zod validation, 30-minute server cache), so the case study can be written around that, with a real snippet such as `toCondition()` or the proxy route.
- **Seat picker:** the "pricing tiers / VIP", "occupancy", "reservation locks", "80+ seat nodes" (it's 100), "isolated re-renders" and "coordinate hash map" claims don't exist. The real highlights to describe are live TMDB movies, Stripe Checkout, server-side seat validation and refresh-safe URL state. Alternatively, build tiers and occupancy. *Decision 8.*
- **Placeholders to confirm:** "Currently Building: Full-Stack SaaS MVP", "100% Client Delivery Focus", skill-level labels, "Remote / Hybrid", and the availability badge.

### Decisions from the design review (defaults used below)

5. **Theme default:** follow the OS, with a persisted override.
6. **Contact form:** API route with Resend, honeypot and rate limit (adds a `RESEND_API_KEY` env var and a `CONTACT_TO` address). Fallback: link cards only.
7. **Demo apps:** adopt the shared tokens and fonts and add a slim header.
8. **Seat picker copy:** describe the real features. Tiers and occupancy are out of scope.

---

## Part 2: Build steps

Each step should end with `npm run typecheck && npm run lint && npm test` passing at the root.

### Phase 0: Groundwork ✅ done 2026-11-14

Changes from the steps below, found while building:
- **TypeScript is pinned to `~6.0.3`.** TS 7.0 is the latest release, but `typescript-eslint` 8.x supports only `<6.1`. Revisit when typescript-eslint adds TS 7 support.
- **TS 6 defaults `types` to `[]`**, so each preset names its types explicitly (`vite/client`, `node`).
- **`node.json` uses `moduleResolution: "bundler"`**, not NodeNext, because the API is bundled by tsup and imports `shared`'s extensionless source.
- **`allowImportingTsExtensions` is on in the base config.** Vite loads `vite.config.ts` with Node's built-in type stripping, so `packages/ui/src/vite.ts` must import `./theme-init.ts` with its extension. Everything is `noEmit`, so this is safe.
- **The API reads `API_PORT`, not `PORT`.** Dev tooling (the preview launcher, many hosts) exports `PORT` for the frontend, and the API inherited 5173. Proxies target `127.0.0.1:3000`.
- **The pre-paint theme script** is the real function `applyInitialTheme`, serialized with `.toString()`. It is unit-tested directly, with no `eval`.
- **Fonts import only the Latin subset.**
- **Dev runs on one origin.** `npm run dev` starts all four servers. Open http://localhost:5173, and the demo apps are proxied at their production paths.

**0.1 Repo skeleton**
- `git init`, `.gitignore` (node_modules, dist, .env*, !.env.example), `.nvmrc`, `.editorconfig`.
- Root `package.json`: `"private": true`, `"workspaces": ["apps/*", "packages/*"]`, `"type": "module"`. Root scripts call `--workspaces --if-present` for `typecheck`, `lint`, `test`, `build`, and `dev` uses `concurrently` to run all four apps.
- Done when `npm install` succeeds with empty workspaces.

**0.2 `packages/tsconfig`**
- `base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`, `moduleResolution: "bundler"`, `target: ES2022`, `skipLibCheck`.
- `react.json` extends base and adds `jsx: "react-jsx"` and DOM libs. `node.json` extends base and adds `module/moduleResolution: "NodeNext"` and `types: ["node"]`.

**0.3 ESLint**
- Root `eslint.config.js` (flat): `@eslint/js`, `typescript-eslint` `strictTypeChecked` with `projectService`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` for `apps/{portfolio,weather,seatpicker}`, and `no-console: warn` (off for `apps/api`).

**0.4 `packages/shared`** (moved forward from the phases so every app can use it)
- `package.json` named `@portfolio/shared`, with `exports: { ".": "./src/index.ts" }` and `zod` as a dependency.
- Empty `src/index.ts` that re-exports `weather.ts`, `seatpicker.ts` and `api.ts` (`ApiError` type).

**0.4b `packages/ui`** (design system, used by all three frontends)
- `theme.css`: Tailwind 4 `@theme` with the semantic color tokens (D1, with the D2/D3 contrast fixes), the typography scale as `--text-*` with line-height, letter-spacing and weight, the fonts (D4), spacing, `--radius-*: 0`, and the motion durations and easings. A `.dark` block redefines the color variables. `@custom-variant dark (&:where(.dark, .dark *))`.
- `fonts.css`: `@fontsource` imports (D7).
- `theme-init.ts`: the pre-paint script inlined into each app's `index.html` (D5). `ThemeToggle.tsx` plus a `useTheme()` hook.
- Exports `.tsx` source like `shared` does. Each app's `index.css` does `@import "tailwindcss"; @import "@portfolio/ui/theme.css";` and `@source "../../packages/ui/src"` so Tailwind scans the shared components.

**0.5 App scaffolds**
- `apps/portfolio`, `apps/weather`, `apps/seatpicker`: Vite + React + TS + `@tailwindcss/vite`. Each `vite.config.ts` sets `base` (`/`, `/projects/weatherappv2/`, `/projects/seatpicker/`), a distinct dev port (5173/5174/5175), and `server.proxy['/api'] → http://localhost:3000`.
- `apps/api`: Express 5. `dev: tsx watch --env-file=.env src/index.ts`, `build: tsup src/index.ts --format esm`, `start: node --env-file=.env dist/index.js`.
- Vitest in every workspace, with a root `vitest.workspace` (or `projects`) config. Frontends use jsdom and `@testing-library/react`; the API uses `supertest`.
- Done when `npm run dev` serves a placeholder page on all three ports, `GET /api/v1/health` returns `{ ok: true }` through each Vite proxy, and one trivial test passes per workspace.

### Phase 1: Portfolio (new design) ✅ done 2026-11-14

Changes from the steps below, found while building:
- **Project copy describes what the rewrite actually does**, not the mockup's features (Decision 8). Every unconfirmed claim is tagged `TODO(copy)` in `src/content/content.ts`. Both code snippets are illustrative until Phases 2 and 4 land the real code.
- **Contact form posts to `/api/v1/contact`** and, until 3.8 exists, shows "couldn't be sent, reach me on LinkedIn". It does not fall back to `mailto:`, which would have put an email address on the page.
- **New `outline-strong` token** for form-control borders, because WCAG 1.4.11 needs 3:1 and `outline` is 1.4:1. `theme.contrast.test.ts` checks every text and border token in both themes.
- **The body scroll lock is CSS** (`html:has(dialog:modal)`). A native modal `<dialog>` doesn't lock scrolling itself.
- **Header layout:** the section nav shows from `md`, and the GitHub button shows on phones and from `lg` (hidden on tablets so the nav fits). The bottom tab bar covers below `md`.
- **`/#section` links** scroll after mount, because the browser looks for the anchor before React renders it.
- **axe-core runs directly** (`vitest-axe` is unmaintained), with the color-contrast rule off in jsdom because the token test covers contrast.
- **jsdom has no `<dialog>`.** `src/test/setup.ts` polyfills `showModal`/`close`. Focus trap, Esc and focus return were verified in a real browser.

Built from `design/`: one responsive page using `packages/ui`.

**1.1 Assets:** copy only `CJfavicon.png` from the old repo, plus `reactweatherpreview.png` and `seatpicker.png` if they're used as case-study screenshots. Brand icons are inline SVG components.

**1.2 Content model** (`src/content.ts`, everything typed, so the copy can be edited without touching components):
- `profile`: name, role, availability, headline (`{ full, short }`), intro, metrics `{ value, label, tone }[]`, `profileCard` (the JSON-snippet fields), location.
- `projects: Project[]` holds `slug` (`'weather' | 'seatpicker'`), `title` / `shortTitle`, `summary` / `shortSummary`, `badges`, `statusLabel`, `highlights[]`, `stack[]`, `liveUrl`, `repoUrl`, and `caseStudy: { tagline, intro, metrics[], challenge, solution, evolution, snippet: { filename, label, code } }`.
- `roadmap` (the "Currently Building" teaser, optional), `capabilities: { title, icon, blurb, items: { name, level, tone }[] }[]`, `engagement[]`, `links` (GitHub, LinkedIn).
- Copy starts from the mockups with the accuracy issues from Part 1b marked `// TODO(copy)`.

**1.3 Components:**
- Primitives in `packages/ui`: `Button` (primary / secondary / link, renders `<a>` or `<button>`), `Tag` (badge and stack chip variants), `Card`, `SectionHeader` (eyebrow, h2, intro), `IconTile`, `Stat`, `ExternalLink`.
- Portfolio components: `SiteHeader` (logo, desktop nav, theme toggle, GitHub, CTA), `MobileTabBar`, `Hero`, `ProfileCard`, `ProjectCard`, `RoadmapTeaser`, `Capabilities`, `Engagement`, `ContactSection` and `ContactForm`, `SiteFooter`, `CaseStudyDialog`.
- Navigation is plain `#anchor` links with `scroll-margin-top` for the sticky header. No JS scrolling.

**1.4 Case-study dialog:** a `useCaseParam()` hook reads and writes `?case=<slug>` with `history.pushState`. The dialog uses `<dialog>.showModal()`, and closes on Esc, a backdrop click, the close button and browser Back. Prev/next switch slugs, focus returns to the card's button, and the body scroll lock comes from the native dialog. The snippet is a `<pre><code>` with a horizontal scroll (syntax highlighting is optional later).

**1.5 Contact form** (UI only here, wired up in 3.8): controlled fields validated with `ContactSchema` from shared, inline field errors, a hidden honeypot field, and `idle | sending | sent | error` states. Until 3.8 lands, submitting falls back to `mailto:`.

**1.6 Tests:**
- `vitest-axe` on the full page in light and dark mode.
- Every project in `content.ts` renders a card.
- `?case=weather` on load opens the dialog, and Esc clears the param.
- The theme toggle sets the `.dark` class and stores the choice.
- Contact form validation messages show.

Done when the page matches the desktop and mobile mockups (with the D-fixes applied) at 375, 768 and 1280 widths with no axe violations, has no layout flash when loading in dark mode, case studies are deep-linkable, and it builds to `dist/` with base `/`.

### Phase 3: API (before the weather app, because both apps need it)

**3.1 Config:** `src/config.ts` parses `process.env` with zod and exits with a list of missing vars. Vars: `API_PORT` (default 3000), `HOST`, `PUBLIC_URL` (url), `TMDB_READ_TOKEN`, `STRIPE_SECRET_KEY`, `WEATHERAPI_KEY`, `NODE_ENV`. Rejects `sk_live_` outside production. Ship `.env.example`.

**3.2 App structure:** `createApp(deps)` in `app.ts` (no `listen`, so tests can call it), `index.ts` starts the server, routers in `routes/{movies,checkout,weather}.ts`, upstream clients in `clients/{tmdb,weatherapi,stripe}.ts` injected through `deps` so tests can fake them. A central error middleware returns `ApiError`.

**3.3 Utilities:** `lib/ttlCache.ts` (generic `TtlCache<K, V>` with max size) and `lib/fetchJson.ts` (timeout plus zod parse, throws `UpstreamError`).

**3.4 Shared seat picker types** in `packages/shared/src/seatpicker.ts`: `MovieSchema` (`id`, `title`, `posterUrl`), `SeatIdSchema` (regex), `CheckoutRequestSchema` (`movieId`, `seats` 1–10, unique), `CheckoutResponseSchema` (`url`), `TICKET_PRICE_CENTS = 1200`.

**3.5 `GET /api/v1/movies`:** TMDB trending/day, top 4 with a poster, cached 1 hour, returns `Movie[]`.

**3.6 `POST /api/v1/checkout`** (renamed from `create-checkout-session`; nothing else calls the old name): validates the body, resolves the movie from the cache (400 if unknown), creates a Checkout Session with inline `price_data`, quantity = seat count, `metadata: { movieId, seats }`, and success/cancel URLs built from `PUBLIC_URL + '/projects/seatpicker/success?session_id={CHECKOUT_SESSION_ID}'` and `/cancel`. No CORS middleware.

**3.7 Tests:** config failure modes, schema edge cases (`0A`, `11A`, duplicate seats, 11 seats), movies cache hit, checkout with a fake Stripe client (asserts URLs and quantity), and an unknown movie id returning 400.

**3.8 `POST /api/v1/contact`** (if Decision 6 stands): `ContactSchema` in shared (name, email, inquiry type enum, message 20–5000 chars, honeypot). Rate limited per IP (e.g. 5 per hour, in memory). A filled honeypot gets a silent 200. Sends via Resend to `CONTACT_TO` with `reply_to` set to the sender. Config adds `RESEND_API_KEY` and `CONTACT_TO`, both optional, and the route returns 503 when they're unset so dev works without them. Tests: validation, honeypot, rate limit, and the fake mail client being called.

Done when, with real test keys in `.env`, `curl` against `/movies` and `/checkout` returns a working Stripe test-mode URL.

### Phase 2: Weather app

**2.1 Check the WeatherAPI plan:** ✅ checked 2026-11-14. `days=7` returns **3 days** on this key, so `FORECAST_DAYS = 3` with a `md:grid-cols-3` grid. Also: for Amsterdam's coordinates `location.name` came back as **"Binnenstad"** (a neighbourhood). Show the city name from `cities.ts`, not the API's `location.name`.

**2.2 Shared types** (`packages/shared/src/weather.ts`): the `Condition` union (without windy/humid by default), `DailyForecastSchema`, `ForecastResponseSchema` (`{ location: { name, country }, days: DailyForecast[] }`), `WeatherQuerySchema` (lat/lon with `z.coerce.number()` and ranges).

**2.3 Condition mapping** (`apps/api/src/weather/conditions.ts`): `CODE_TO_CONDITION: Record<number, Condition>` plus `toCondition(code)` with a `cloudy` fallback. Commit `weather_conditions.json` as a fixture and test that every code maps.

**2.4 `GET /api/v1/weather?lat&lon`:** validate, round to 2 decimals, check the cache (30 min, max 200 entries), fetch, zod-parse the upstream response (only the fields used), normalize, return. Upstream errors return 502.

**2.5 Frontend data:** `src/cities.ts` is generated once from `city_coordinates.csv` (55 rows) by a one-off script you don't need to commit. It holds `City { name, country, lat, lon }` typed `as const satisfies readonly City[]`. Watch for `Åstorp` and other non-ASCII names.

**2.6 Frontend UI** (styled with `packages/ui` tokens, flat cards, with the slim "← Portfolio" header and theme toggle per Decision 7; the SVG icons need a check in dark mode): `useForecast(city)` hook with a discriminated-union state (`idle | loading | error | success`) and `AbortController` on city change, a `CitySelect`, a `UnitToggle` (`'C' | 'F'` with `aria-pressed`), and `ForecastCard` (icon `images/${condition}.svg` with `alt={label}`, date formatted in UTC). Copy the 16 SVGs and `weatherAppico.svg` (favicon).

**2.7 Tests:** the condition fixture test, the date formatting test (UTC boundary), the proxy route with a fake client (cache hit means one upstream call), and hook state transitions.

Done when choosing Amsterdam shows N cards with correct icons, the toggle switches units without a refetch, and an API outage shows the error state.

### Phase 4: Seat picker frontend

**4.1 Assets:** none required (posters come from TMDB). Optionally a local fallback poster.

**4.2 Seats:** `src/seats.ts` exports `ROWS = 10`, `COLUMNS = ['A'..'J'] as const`, `buildSeatMap(): SeatId[][]` and `AISLE_AFTER_ROW = 5`. Unit-test the shape and the ids.

**4.3 State in the URL:** `/seats?movie=123&seats=1A,1B` via `useSearchParams`. A `useSelection()` hook parses with the shared schemas and silently drops invalid seats. Checkout reads the same params, so a refresh keeps everything.

**4.4 Routes:** `/` (movies), `/seats`, `/checkout`, `/success`, `/cancel` (with a link back to `/seats?…`), and `*` (not found). Delete `success.html` and `cancel.html`.

**4.5 Movie selection:** typed `fetchMovies()` parsed with `MovieSchema.array()`, loading and error states, posters as `<button>`s with `alt={title}`, and the mobile carousel buttons given `aria-label`s.

**4.6 Seat grid:** each seat is a `<button aria-pressed>` (not a clickable icon), Confirm is disabled at 0 seats, and the 10-seat cap matches the server.

**4.6b Styling:** replace the old cyan-glow and `#1a1a1a` look with `packages/ui` tokens and the slim header (Decision 7). Selected seats use `primary` and available seats use `outline`, with a legend.

**4.7 Checkout:** total from `TICKET_PRICE_CENTS`, POST through a typed client, inline error message instead of `alert`, no `console.log`, and none of the commented-out legacy form.

**4.8 Tests:** URL round-trip for the selection, invalid seats dropped, and the Checkout payload shape.

Done when a full flow works end to end in dev: pick a movie, pick seats, refresh (state survives), Stripe test card `4242 4242 4242 4242`, land on `/success`. Cancel lands on `/cancel`.

### Phase 5: Wrap-up (still before deployment)

- `npm run build` at the root produces four `dist/` folders. Check the asset paths respect each `base` using `vite preview`.
- A README with setup, env vars, and the dev command.
- A short note for the future deployment plan: the SPA fallback is needed for `/projects/seatpicker/*` deep links, `/api` is reverse-proxied to Node, and the API reads `.env` via `--env-file`.

---

## Rough effort

| Phase | Size | Risk |
|---|---|---|
| 0 Groundwork (+ `packages/ui`) | M | Low to medium. Tailwind 4 `@theme` with class-based dark mode across workspaces. |
| 1 Portfolio (new design) | L | Medium. The dialog, the responsive nav split, and content that still needs your edits. |
| 3 API (+ contact) | M | Medium. Stripe and TMDB contracts. |
| 2 Weather | M | Medium. Plan's day count and code mapping. |
| 4 Seat picker | M | Low to medium |
| 5 Wrap-up | S | Low |
