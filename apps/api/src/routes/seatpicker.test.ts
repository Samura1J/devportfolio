import { ApiErrorSchema, CheckoutResponseSchema, CheckoutSummarySchema, MovieListSchema } from "@portfolio/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { fakeGateway, MOVIES, SUMMARY, testApp } from "../test/fakes";

describe("GET /api/v1/movies", () => {
  it("returns the catalog as Movie[]", async () => {
    const res = await request(testApp()).get("/api/v1/movies").expect(200);
    expect(MovieListSchema.parse(res.body)).toEqual(MOVIES);
  });
});

describe("POST /api/v1/checkout", () => {
  it("creates a session for a known movie, built from server-side data", async () => {
    const { gateway, createSession } = fakeGateway();
    const res = await request(testApp({ checkout: gateway }))
      .post("/api/v1/checkout")
      .send({ movieId: 101, seats: ["1A", "10J"] })
      .expect(201);

    expect(CheckoutResponseSchema.parse(res.body).url).toContain("checkout.stripe.com");
    expect(createSession).toHaveBeenCalledOnce();
    const input = createSession.mock.calls[0]?.[0];
    expect(input?.movie).toEqual(MOVIES[0]);
    expect(input?.seats).toEqual(["1A", "10J"]);
    expect(input?.successUrl).toBe(
      "https://example.test/projects/seatpicker/success?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(input?.cancelUrl).toBe("https://example.test/projects/seatpicker/cancel?movie=101&seats=1A%2C10J");
  });

  it("ignores any client-sent title or price", async () => {
    const { gateway, createSession } = fakeGateway();
    await request(testApp({ checkout: gateway }))
      .post("/api/v1/checkout")
      .send({ movieId: 101, seats: ["1A"], title: "Free Movie", priceCents: 1 })
      .expect(201);
    expect(createSession.mock.calls[0]?.[0].movie.title).toBe("Future City");
  });

  it("rejects a movie that isn't showing", async () => {
    const { gateway, createSession } = fakeGateway();
    const res = await request(testApp({ checkout: gateway }))
      .post("/api/v1/checkout")
      .send({ movieId: 999, seats: ["1A"] })
      .expect(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe("unknown_movie");
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([
    ["no seats", []],
    ["a seat off the map", ["11A"]],
    ["row zero", ["0A"]],
    ["a bad column", ["1K"]],
    ["a duplicate seat", ["1A", "1A"]],
    ["too many seats", ["1A", "1B", "1C", "1D", "1E", "1F", "1G", "1H", "1I", "1J", "2A"]],
  ])("rejects %s", async (_label, seats) => {
    const { gateway, createSession } = fakeGateway();
    const res = await request(testApp({ checkout: gateway }))
      .post("/api/v1/checkout")
      .send({ movieId: 101, seats })
      .expect(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe("invalid_request");
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/checkout/:sessionId", () => {
  it("returns the session summary", async () => {
    const { gateway, getSummary } = fakeGateway();
    const res = await request(testApp({ checkout: gateway })).get("/api/v1/checkout/cs_test_abc123").expect(200);
    expect(CheckoutSummarySchema.parse(res.body)).toEqual(SUMMARY);
    expect(getSummary).toHaveBeenCalledWith("cs_test_abc123");
  });

  it("rejects ids that aren't Stripe session ids", async () => {
    const { gateway, getSummary } = fakeGateway();
    await request(testApp({ checkout: gateway })).get("/api/v1/checkout/..%2Fsecrets").expect(400);
    expect(getSummary).not.toHaveBeenCalled();
  });
});
