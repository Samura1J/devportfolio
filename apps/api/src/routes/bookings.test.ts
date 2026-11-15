import { ApiErrorSchema, SeatAvailabilitySchema, SeatsTakenErrorSchema } from "@portfolio/shared";
import Stripe from "stripe";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createWebhookVerifier } from "../clients/checkout";
import { fakeGateway, SUMMARY, testApp } from "../test/fakes";

// Each visitor is a supertest agent, which keeps its own cookies like a
// browser. trust proxy is "loopback" and supertest connects from 127.0.0.1, so
// X-Forwarded-For sets the IP: by default everyone shares one, like an office.
const OFFICE_IP = "203.0.113.1";
type App = ReturnType<typeof testApp>;
const browser = (app: App) => request.agent(app).set("X-Forwarded-For", OFFICE_IP);
type Browser = ReturnType<typeof browser>;

const takenFor = async (visitor: Browser) => {
  const res = await visitor.get("/api/v1/movies/101/seats").expect(200);
  return SeatAvailabilitySchema.parse(res.body).taken.sort();
};
const buy = (visitor: Browser, seats: string[]) => visitor.post("/api/v1/checkout").send({ movieId: 101, seats });

describe("double booking (the two-tab test)", () => {
  it("lets one of two simultaneous checkouts for the same seat win, and tells the other which seat", async () => {
    const { gateway, createSession } = fakeGateway();
    const app = testApp({ checkout: gateway });

    const [a, b] = await Promise.all([buy(browser(app), ["5E", "5F"]), buy(browser(app), ["5F", "6A"])]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const loser = a.status === 409 ? a : b;
    expect(SeatsTakenErrorSchema.parse(loser.body).error.seats).toEqual(["5F"]);
    expect(createSession).toHaveBeenCalledOnce();
  });

  it("shows held seats to everyone except the browser holding them", async () => {
    const { gateway } = fakeGateway();
    const app = testApp({ checkout: gateway });
    const alice = browser(app);
    await buy(alice, ["1A"]).expect(201);

    expect(await takenFor(browser(app))).toEqual(["1A"]);
    expect(await takenFor(alice)).toEqual([]);
  });

  it("keeps two browsers on one network apart, but replaces a browser's own earlier checkout", async () => {
    const { gateway, expireSession } = fakeGateway();
    const app = testApp({ checkout: gateway });
    const alice = browser(app);
    const bob = browser(app);
    await buy(alice, ["1A"]).expect(201);
    await buy(bob, ["1B"]).expect(201);
    expect(expireSession).not.toHaveBeenCalled();

    await buy(alice, ["1C"]).expect(201); // Alice went back and changed seats
    expect(expireSession).toHaveBeenCalledWith("cs_test_1");
    expect(await takenFor(browser(app))).toEqual(["1B", "1C"]);
  });

  it("gives each browser an HttpOnly id cookie once, and replaces a malformed one", async () => {
    const app = testApp();
    const first = await request(app).get("/api/v1/movies/101/seats").expect(200);
    const cookie = first.get("Set-Cookie")?.[0] ?? "";
    expect(cookie).toMatch(/^seat_visitor=[0-9a-f-]{36}; /);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/api/v1");
    expect(cookie).not.toContain("Secure"); // plain http here

    const https = await request(app).get("/api/v1/movies/101/seats").set("X-Forwarded-Proto", "https").expect(200);
    expect(https.get("Set-Cookie")?.[0]).toContain("Secure");

    const again = await request(app).get("/api/v1/movies/101/seats").set("Cookie", cookie.split(";")[0] ?? "").expect(200);
    expect(again.get("Set-Cookie")).toBeUndefined();
    const forged = await request(app).get("/api/v1/movies/101/seats").set("Cookie", "seat_visitor=alice").expect(200);
    expect(forged.get("Set-Cookie")?.[0]).toMatch(/^seat_visitor=[0-9a-f-]{36}; /);
  });

  it("validates the movie for availability", async () => {
    const app = testApp();
    const bad = await request(app).get("/api/v1/movies/abc/seats").expect(400);
    expect(ApiErrorSchema.parse(bad.body).error.code).toBe("invalid_request");
    const unknown = await request(app).get("/api/v1/movies/999/seats").expect(400);
    expect(ApiErrorSchema.parse(unknown.body).error.code).toBe("unknown_movie");
  });

  it("rate limits checkouts per IP", async () => {
    const app = testApp({ checkoutLimit: { limit: 1, windowMs: 60_000 } });
    await buy(browser(app), ["1A"]).expect(201);
    await buy(browser(app), ["1B"]).expect(429);
  });

  it("marks seats sold when the success page finds the session paid", async () => {
    const { gateway, getSummary } = fakeGateway();
    const app = testApp({ checkout: gateway });
    const alice = browser(app);
    await buy(alice, ["1A"]).expect(201);
    getSummary.mockResolvedValueOnce({ ...SUMMARY, paid: true });
    await request(app).get("/api/v1/checkout/cs_test_1").expect(200);

    expect(await takenFor(alice)).toEqual(["1A"]); // sold: shown even to the buyer
  });
});

describe("POST /api/v1/stripe/webhook", () => {
  const secret = "whsec_test_secret";
  const signer = new Stripe("sk_test_signing_only");
  const event = (type: string, object: Record<string, unknown>) =>
    JSON.stringify({ id: "evt_1", object: "event", type, data: { object: { object: "checkout.session", ...object } } });
  const send = (app: App, payload: string, signature?: string) =>
    request(app)
      .post("/api/v1/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", signature ?? signer.webhooks.generateTestHeaderString({ payload, secret }))
      .send(payload);

  const setup = async () => {
    const { gateway } = fakeGateway();
    const app = testApp({ checkout: gateway, verifyWebhook: createWebhookVerifier(secret) });
    const alice = browser(app);
    await buy(alice, ["1A"]).expect(201);
    return { app, alice };
  };

  it("sells the seats on checkout.session.completed", async () => {
    const { app, alice } = await setup();
    await send(app, event("checkout.session.completed", { id: "cs_test_1", payment_status: "paid" })).expect(200, {
      received: true,
    });
    expect(await takenFor(alice)).toEqual(["1A"]);
  });

  it("frees the seats on checkout.session.expired", async () => {
    const { app } = await setup();
    await send(app, event("checkout.session.expired", { id: "cs_test_1", payment_status: "unpaid" })).expect(200);
    expect(await takenFor(browser(app))).toEqual([]);
  });

  it("acknowledges events it doesn't use", async () => {
    const { app } = await setup();
    await send(app, event("customer.created", { id: "cus_1" })).expect(200);
    expect(await takenFor(browser(app))).toEqual(["1A"]);
  });

  it("rejects a bad or missing signature", async () => {
    const { app, alice } = await setup();
    const payload = event("checkout.session.completed", { id: "cs_test_1", payment_status: "paid" });
    const forged = signer.webhooks.generateTestHeaderString({ payload, secret: "whsec_wrong" });
    const res = await send(app, payload, forged).expect(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe("invalid_signature");
    await request(app).post("/api/v1/stripe/webhook").set("Content-Type", "application/json").send(payload).expect(400);
    expect(await takenFor(alice)).toEqual([]); // still only Alice's unpaid hold
  });

  it("answers 503 when no webhook secret is configured", async () => {
    await request(testApp()).post("/api/v1/stripe/webhook").set("Content-Type", "application/json").send("{}").expect(503);
  });
});
