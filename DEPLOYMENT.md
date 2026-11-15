# Deployment notes

Deployment isn't built yet. These are the requirements the code already assumes, so the deployment plan can start from them. `npm run preview` reproduces this layout locally, using `vite preview` in place of the web server.

## What gets deployed

`npm run build` at the root produces:

| Output | Serve at | Kind |
|---|---|---|
| `apps/portfolio/dist/` | `/` | Static files |
| `apps/weather/dist/` | `/projects/weatherappv2/` | Static files |
| `apps/seatpicker/dist/` | `/projects/seatpicker/` | Static files |
| `apps/api/dist/index.js` | `/api/` (reverse proxy) | Node 22.12+ process, a single bundled file |

Each app's Vite `base` is already set to its path, so every asset URL in the built HTML, CSS and JS is absolute (for example, `/projects/seatpicker/assets/…`). The folders must be served at exactly those paths.

## Web server requirements

1. **SPA fallback.** The seat picker uses real URLs (`/projects/seatpicker/seats?movie=…`, `/success?session_id=…`), and Stripe redirects buyers straight to them. Any unknown path under `/projects/seatpicker/` must return that app's `index.html`. Do the same for `/projects/weatherappv2/`. The portfolio is a single page; returning its `index.html` or a 404 for unknown paths are both fine.
2. **`/api/` proxy.** Pass `/api/` to the Node process. It listens on `127.0.0.1:3000` by default. Keep it bound to loopback.
3. **Client IP.** The API trusts `X-Forwarded-For` only from loopback (Express `trust proxy: "loopback"`). The proxy must run on the same host and set that header. Rate limits and seat-hold ownership both use the client IP.
4. **Raw webhook body.** Don't let the proxy rewrite `POST /api/v1/stripe/webhook`; Stripe signs the exact bytes.
5. **Caching.** Files under `*/assets/` have hashed names and can be cached for a year. Don't cache `index.html`.

An nginx sketch:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location /projects/seatpicker/ {
    alias /srv/portfolio/seatpicker/;
    try_files $uri $uri/ /projects/seatpicker/index.html;
}
location /projects/weatherappv2/ {
    alias /srv/portfolio/weather/;
    try_files $uri $uri/ /projects/weatherappv2/index.html;
}
location / {
    root /srv/portfolio/portfolio;
    try_files $uri $uri/ /index.html;
}
```

## Running the API

```bash
NODE_ENV=production node --env-file=.env dist/index.js
```

- **Environment.** Node reads `.env` through `--env-file`; nothing else loads it. With `NODE_ENV=production`, the API refuses to start unless `PUBLIC_URL`, `TMDB_READ_TOKEN`, `STRIPE_SECRET_KEY` and `WEATHERAPI_KEY` are all set. A live Stripe key is accepted only in production. `README.md` lists every variable.
- **`PUBLIC_URL`** must be the public origin, such as `https://example.com`. Stripe's success and cancel redirects are built from it.
- **Seats database.** `SEAT_DB_PATH` (default `data/seats.db`, relative to the working directory) needs a writable, persistent location; WAL mode adds `-wal` and `-shm` files next to it. Run **one** API process: holds rely on SQLite transactions within a single process. Losing the file only frees today's holds and sales.
- **Stripe webhook.** Recommended in production. In the Stripe dashboard, add an endpoint at `https://<origin>/api/v1/stripe/webhook` for these events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`. Then set `STRIPE_WEBHOOK_SECRET`. Without it, payments are still confirmed from the success page and from the expiry check, only later.
- **Node 22's** built-in SQLite prints one "experimental" warning at startup. It's harmless, and `--disable-warning=ExperimentalWarning` hides it.
- **Restarts.** Run the API under a supervisor (systemd or similar) that restarts it on failure. It needs no build step on the server beyond copying `dist/index.js`. Runtime dependencies (`express`, `stripe`, `zod`) are still imported from `node_modules`, so install them with `npm ci --omit=dev -w @portfolio/api`.
