import { ApiErrorSchema, SeatAvailabilitySchema, SeatsTakenErrorSchema } from "@portfolio/shared";
import Stripe from "stripe";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createWebhookVerifier } from "../clients/checkout";
import { fakeGateway, SUMMARY, testApp } from "../test/fakes";

// trust proxy is "loopback", and supertest connects from 127.0.0.1, so
// X-Forwarded-For stands in for two different visitors.
const ALICE = "203.0.113.1";
const BOB = "203.0.113.2";

const takenFor = async (app: ReturnType<typeof testApp>, ip: string) => {
  const res = await request(app).get("/api/v1/movies/101/seats").set("X-Forwarded-For", ip).expect(200);
  return SeatAvailabilitySchema.parse(res.body).taken.sort();
};

describe("double booking (the two-tab test)", () => {
  it("lets one of two simultaneous checkouts for the same seat win, and tells the other which seat", async () => {
    const { gateway, createSession } = fakeGateway();
    const app = testApp({ checkout: gateway });
    const order = { movieId: 101, seats: ["5E", "5F"] };

    const [a, b] = await Promise.all([
      request(app).post("/api/v1/checkout").set("X-Forwarded-For", ALICE).send(order),
      request(app).post("/api/v1/checkout").set("X-Forwarded-For", BOB).send({ ...order, seats: ["5F", "6A"] }),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const loser = a.status === 409 ? a : b;
    expect(SeatsTakenErrorSchema.parse(loser.body).error.seats).toEqual(["5F"]);
    expect(createSession).toHaveBeenCalledOnce();
  });

  it("shows held seats to everyone except the visitor holding them", async () => {
    const { gateway } = fakeGateway();
    const app = testApp({ checkout: gateway });
    await request(app).post("/api/v1/checkout").set("X-Forwarded-For", ALICE).send({ movieId: 101, seats: ["1A"] }).expect(201);

    expect(await takenFor(app, BOB)).toEqual(["1A"]);
    expect(await takenFor(app, ALICE)).toEqual([]);
  });

  it("validates the movie for availability", async () => {
    const app = testApp();
    const bad = await request(app).get("/api/v1/movies/abc/seats").expect(400);
    expect(ApiErrorSchema.parse(bad.body).error.code).toBe("invalid_request");
    const unknown = await request(app).get("/api/v1/movies/999/seats").expect(400);
    expect(ApiErrorSchema.parse(unknown.body).error.code).toBe("unknown_movie");
  });

  it("rate limits checkouts per visitor", async () => {
    const app = testApp({ checkoutLimit: { limit: 1, windowMs: 60_000 } });
    await request(app).post("/api/v1/checkout").set("X-Forwarded-For", ALICE).send({ movieId: 101, seats: ["1A"] }).expect(201);
    await request(app).post("/api/v1/checkout").set("X-Forwarded-For", ALICE).send({ movieId: 101, seats: ["1B"] }).expect(429);
  });

  it("marks seats sold when the success page finds the session paid", async () => {
    const { gateway, getSummary } = fakeGateway();
    const app = testApp({ checkout: gateway });
    await request(app).post("/api/v1/checkout").set("X-Forwarded-For", ALICE).send({ movieId: 101, seats: ["1A"] }).expect(201);
    getSummary.mockResolvedValueOnce({ ...SUMMARY, paid: true });
    await request(app).get("/api/v1/checkout/cs_test_1").expect(200);

    expect(await takenFor(app, ALICE)).toEqual(["1A"]); // sold: shown even to the buyer
  });
});

describe("POST /api/v1/stripe/webhook", () => {
  const secret = "whsec_test_secret";
  const signer = new Stripe("sk_test_signing_only");
  const event = (type: string, object: Record<string, unknown>) =>
    JSON.stringify({ id: "evt_1", object: "event", type, data: { object: { object: "checkout.session", ...object } } });
  const send = (app: ReturnType<typeof testApp>, payload: string, signature?: string) =>
    request(app)
      .post("/api/v1/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", signature ?? signer.webhooks.generateTestHeaderString({ payload, secret }))
      .send(payload);

  const setup = async () => {
    const { gateway } = fakeGateway();
    const app = testApp({ checkout: gateway, verifyWebhook: createWebhookVerifier(secret) });
    await request(app).post("/api/v1/checkout").set("X-Forwarded-For", ALICE).send({ movieId: 101, seats: ["1A"] }).expect(201);
    return app;
  };

  it("sells the seats on checkout.session.completed", async () => {
    const app = await setup();
    await send(app, event("checkout.session.completed", { id: "cs_test_1", payment_status: "paid" })).expect(200, {
      received: true,
    });
    expect(await takenFor(app, ALICE)).toEqual(["1A"]);
  });

  it("frees the seats on checkout.session.expired", async () => {
    const app = await setup();
    await send(app, event("checkout.session.expired", { id: "cs_test_1", payment_status: "unpaid" })).expect(200);
    expect(await takenFor(app, BOB)).toEqual([]);
  });

  it("acknowledges events it doesn't use", async () => {
    const app = await setup();
    await send(app, event("customer.created", { id: "cus_1" })).expect(200);
    expect(await takenFor(app, BOB)).toEqual(["1A"]);
  });

  it("rejects a bad or missing signature", async () => {
    const app = await setup();
    const payload = event("checkout.session.completed", { id: "cs_test_1", payment_status: "paid" });
    const forged = signer.webhooks.generateTestHeaderString({ payload, secret: "whsec_wrong" });
    const res = await send(app, payload, forged).expect(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe("invalid_signature");
    await request(app).post("/api/v1/stripe/webhook").set("Content-Type", "application/json").send(payload).expect(400);
    expect(await takenFor(app, ALICE)).toEqual([]); // still only Alice's unpaid hold
  });

  it("answers 503 when no webhook secret is configured", async () => {
    await request(testApp()).post("/api/v1/stripe/webhook").set("Content-Type", "application/json").send("{}").expect(503);
  });
});
