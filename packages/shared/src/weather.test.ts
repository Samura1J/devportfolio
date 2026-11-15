import { describe, expect, it } from "vitest";
import { formatForecastDate, LocationSearchQuerySchema, WeatherQuerySchema } from "./weather";

describe("WeatherQuerySchema", () => {
  it("coerces query-string coordinates", () => {
    expect(WeatherQuerySchema.parse({ lat: "52.367", lon: " 4.904" })).toEqual({ lat: 52.367, lon: 4.904 });
  });

  it.each([
    ["missing lat", { lon: "4.9" }],
    ["blank lat", { lat: "", lon: "4.9" }],
    ["lat out of range", { lat: "90.1", lon: "4.9" }],
    ["lon out of range", { lat: "52", lon: "-180.5" }],
    ["not a number", { lat: "north", lon: "4.9" }],
    ["repeated param", { lat: ["1", "2"], lon: "4.9" }],
  ])("rejects %s", (_label, query) => {
    expect(WeatherQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe("formatForecastDate", () => {
  it("keeps the calendar date regardless of the local time zone", () => {
    // new Date("2026-11-14") is UTC midnight; formatting it in a US time zone
    // without timeZone: "UTC" would show Nov 13.
    expect(formatForecastDate("2026-11-14")).toBe("Sat, Nov 14");
    expect(formatForecastDate("2027-01-01")).toBe("Fri, Jan 1");
  });
});

describe("LocationSearchQuerySchema", () => {
  it("trims and needs at least 3 characters", () => {
    expect(LocationSearchQuerySchema.parse({ q: "  ams " })).toEqual({ q: "ams" });
    expect(LocationSearchQuerySchema.safeParse({ q: " am " }).success).toBe(false);
    expect(LocationSearchQuerySchema.safeParse({ q: "x".repeat(81) }).success).toBe(false);
    expect(LocationSearchQuerySchema.safeParse({ q: ["ams", "par"] }).success).toBe(false);
  });
});
