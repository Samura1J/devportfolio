import { API_BASE, type ApiError, type HealthResponse } from "@portfolio/shared";
import express, { type ErrorRequestHandler, type Express } from "express";

/** Builds the app without listening, so tests can drive it directly. */
export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");

  const api = express.Router();

  api.get("/health", (_req, res) => {
    const body: HealthResponse = { ok: true };
    res.json(body);
  });

  app.use(API_BASE, api);

  app.use((_req, res) => {
    const body: ApiError = { error: { code: "not_found", message: "Not found" } };
    res.status(404).json(body);
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    const body: ApiError = { error: { code: "internal", message: "Internal server error" } };
    res.status(500).json(body);
  };
  app.use(onError);

  return app;
}
