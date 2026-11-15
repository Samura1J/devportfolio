import { ApiErrorSchema, ForecastResponseSchema, LocationSearchResponseSchema } from "@portfolio/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { FORECAST, fakeWeather, PLACES, testApp } from "../test/fakes";

describe("GET /api/v1/weather", () => {
  it("returns the forecast for valid coordinates", async () => {
    const { weather, getForecast } = fakeWeather();
    const res = await request(testApp({ weather })).get("/api/v1/weather?lat=52.367&lon=4.904").expect(200);
    expect(ForecastResponseSchema.parse(res.body)).toEqual(FORECAST);
    expect(getForecast).toHaveBeenCalledWith(52.367, 4.904);
  });

  it.each(["", "?lat=52", "?lat=&lon=4", "?lat=91&lon=0", "?lat=0&lon=181", "?lat=a&lon=b", "?lat=1&lat=2&lon=3"])(
    "rejects %j with a 400",
    async (query) => {
      const { weather, getForecast } = fakeWeather();
      const res = await request(testApp({ weather })).get(`/api/v1/weather${query}`).expect(400);
      expect(ApiErrorSchema.parse(res.body).error.code).toBe("invalid_request");
      expect(getForecast).not.toHaveBeenCalled();
    },
  );

  it("rate limits per IP, with one budget for forecasts and searches", async () => {
    const app = testApp({ weatherLimit: { limit: 2, windowMs: 60_000 } });
    await request(app).get("/api/v1/weather/search?q=paris").expect(200);
    await request(app).get("/api/v1/weather?lat=1&lon=1").expect(200);
    const res = await request(app).get("/api/v1/weather?lat=1&lon=1").expect(429);
    expect(res.headers["retry-after"]).toBe("60");
  });
});

describe("GET /api/v1/weather/search", () => {
  it("returns matching places", async () => {
    const { weather, searchLocations } = fakeWeather();
    const res = await request(testApp({ weather })).get("/api/v1/weather/search?q=%20Amsterdam%20").expect(200);
    expect(LocationSearchResponseSchema.parse(res.body)).toEqual(PLACES);
    expect(searchLocations).toHaveBeenCalledWith("Amsterdam");
  });

  it.each(["", "?q=", "?q=am", "?q=%20%20am%20", `?q=${"x".repeat(81)}`, "?q=par&q=ams"])("rejects %j with a 400", async (query) => {
    const { weather, searchLocations } = fakeWeather();
    const res = await request(testApp({ weather })).get(`/api/v1/weather/search${query}`).expect(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe("invalid_request");
    expect(searchLocations).not.toHaveBeenCalled();
  });
});
