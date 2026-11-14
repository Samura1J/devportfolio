import { describe, expect, it } from "vitest";
import { ApiErrorSchema, HealthResponseSchema } from "./api";

describe("api schemas", () => {
  it("accepts a valid health response", () => {
    expect(HealthResponseSchema.parse({ ok: true })).toEqual({ ok: true });
  });

  it("rejects an unhealthy response", () => {
    expect(HealthResponseSchema.safeParse({ ok: false }).success).toBe(false);
  });

  it("requires code and message on errors", () => {
    expect(ApiErrorSchema.safeParse({ error: { code: "x" } }).success).toBe(false);
  });
});
