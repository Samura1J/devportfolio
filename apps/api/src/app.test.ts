import { ApiErrorSchema, HealthResponseSchema } from "@portfolio/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("api", () => {
  const app = createApp();

  it("GET /api/v1/health returns ok", async () => {
    const res = await request(app).get("/api/v1/health").expect(200);
    expect(HealthResponseSchema.parse(res.body)).toEqual({ ok: true });
  });

  it("unknown routes return a typed 404", async () => {
    const res = await request(app).get("/api/v1/nope").expect(404);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe("not_found");
  });
});
