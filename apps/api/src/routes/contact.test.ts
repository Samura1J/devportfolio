import { ApiErrorSchema } from "@portfolio/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { fakeMailer, testApp } from "../test/fakes";

const valid = {
  name: "Jane Doe",
  email: "jane@example.com",
  inquiryType: "contract",
  message: "We need a React developer for a three-month build.",
  website: "",
};

describe("POST /api/v1/contact", () => {
  it("sends a valid message", async () => {
    const { mailer, sendContact } = fakeMailer();
    await request(testApp({ mailer })).post("/api/v1/contact").send(valid).expect(202, { ok: true });
    expect(sendContact).toHaveBeenCalledWith(expect.objectContaining({ email: "jane@example.com" }));
  });

  it("answers a filled honeypot like a success but sends nothing", async () => {
    const { mailer, sendContact } = fakeMailer();
    await request(testApp({ mailer }))
      .post("/api/v1/contact")
      .send({ ...valid, website: "http://spam.example" })
      .expect(202, { ok: true });
    expect(sendContact).not.toHaveBeenCalled();
  });

  it("rejects an invalid message", async () => {
    const { mailer, sendContact } = fakeMailer();
    const res = await request(testApp({ mailer }))
      .post("/api/v1/contact")
      .send({ ...valid, email: "nope" })
      .expect(400);
    expect(ApiErrorSchema.parse(res.body).error.message).toMatch(/^email:/);
    expect(sendContact).not.toHaveBeenCalled();
  });

  it("rate limits per IP and says when to retry", async () => {
    let now = 0;
    const app = testApp({ contactLimit: { limit: 2, windowMs: 60_000, now: () => now } });
    await request(app).post("/api/v1/contact").send(valid).expect(202);
    await request(app).post("/api/v1/contact").send(valid).expect(202);
    const res = await request(app).post("/api/v1/contact").send(valid).expect(429);
    expect(res.headers["retry-after"]).toBe("60");

    now = 60_000; // window over
    await request(app).post("/api/v1/contact").send(valid).expect(202);
  });
});
