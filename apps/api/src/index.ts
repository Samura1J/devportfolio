import { createApp } from "./app";

// Phase 3 replaces this with a validated config module.
// API_PORT, not PORT: dev tooling exports PORT for the frontend servers.
const port = Number(process.env.API_PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

createApp().listen(port, host, (error) => {
  if (error) throw error;
  console.log(`API listening at http://${host}:${String(port)}`);
});
