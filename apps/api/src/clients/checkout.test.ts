import { describe, expect, it } from "vitest";
import { MOVIES } from "../test/fakes";
import { sessionParams } from "./checkout";

const MOVIE = MOVIES[0] ?? { id: 101, title: "Future City", posterUrl: "https://image.tmdb.org/t/p/w500/a.jpg" };

describe("Stripe session params", () => {
  const params = sessionParams({
    movie: MOVIE,
    seats: ["1A", "1B"],
    successUrl: "https://example.test/success?session_id={CHECKOUT_SESSION_ID}",
    cancelUrl: "https://example.test/cancel",
    holdId: "hold-1",
    expiresAt: Date.parse("2026-11-15T12:31:00Z"),
  });

  it("takes cards only, so no payment is left settling while seats are held", () => {
    expect(params.allowed_payment_method_types).toEqual(["card"]);
  });

  it("charges the shared ticket price per seat and expires with the hold", () => {
    expect(params.line_items?.[0]).toMatchObject({ quantity: 2, price_data: { currency: "usd", unit_amount: 1200 } });
    expect(params.expires_at).toBe(Date.parse("2026-11-15T12:31:00Z") / 1000);
    expect(params.metadata).toMatchObject({ holdId: "hold-1", seats: "1A,1B" });
    expect(params.success_url).toContain("{CHECKOUT_SESSION_ID}");
  });
});
