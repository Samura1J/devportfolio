import { ApiErrorSchema, HealthResponseSchema } from "@portfolio/shared";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { UpstreamError } from "./lib/errors";
import { fakeCatalog, testApp, testConfig } from "./test/fakes";

describe("app", () => {
  it("GET /api/v1/health returns ok", async () => {
    const res = await request(testApp()).get("/api/v1/health").expect(200);
    expect(HealthResponseSchema.parse(res.body)).toEqual({ ok: true });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("unknown routes return a typed 404", async () => {
    const res = await request(testApp()).get("/api/v1/nope").expect(404);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe("not_found");
  });

  it("malformed JSON is a 400, not a 500", async () => {
    const res = await request(testApp())
      .post("/api/v1/checkout")
      .set("Content-Type", "application/json")
      .send("{not json")
      .expect(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe("invalid_json");
  });

  it("oversized bodies are rejected with 413", async () => {
    const res = await request(testApp())
      .post("/api/v1/contact")
      .send({ message: "x".repeat(20_000) })
      .expect(413);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe("payload_too_large");
  });

  it("upstream failures become a 502 without leaking details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const movies = { ...fakeCatalog(), listMovies: () => Promise.reject(new UpstreamError("TMDB", "HTTP 401: secret detail")) };
    const res = await request(testApp({ movies })).get("/api/v1/movies").expect(502);
    expect(JSON.stringify(res.body)).not.toContain("secret detail");
    expect(ApiErrorSchema.parse(res.body).error.code).toBe("upstream_error");
  });

  it("unexpected errors are a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const movies = { ...fakeCatalog(), listMovies: () => Promise.reject(new Error("boom")) };
    const res = await request(testApp({ movies })).get("/api/v1/movies").expect(500);
    expect(ApiErrorSchema.parse(res.body).error.message).toBe("Internal server error");
  });

  it("features without credentials answer 503", async () => {
    const app = createApp({ config: testConfig() });
    for (const [method, path] of [
      ["get", "/api/v1/movies"],
      ["post", "/api/v1/checkout"],
      ["post", "/api/v1/contact"],
    ] as const) {
      const res = await request(app)[method](path).send({}).expect(503);
      expect(ApiErrorSchema.parse(res.body).error.code).toBe("not_configured");
    }
  });
});
