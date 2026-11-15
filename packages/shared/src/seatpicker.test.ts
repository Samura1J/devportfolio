import { describe, expect, it } from "vitest";
import { CheckoutRequestSchema, formatPrice, isSeatId, MAX_SEATS_PER_ORDER, TICKET_PRICE_CENTS } from "./seatpicker";

describe("seat ids", () => {
  it.each(["1A", "5E", "10A", "10J"])("accepts %s", (id) => {
    expect(isSeatId(id)).toBe(true);
  });

  it.each(["0A", "11A", "1K", "1a", "A1", "01A", "1.5A", " 1A", ""])("rejects %j", (id) => {
    expect(isSeatId(id)).toBe(false);
  });
});

describe("CheckoutRequestSchema", () => {
  it("accepts up to the seat limit", () => {
    const seats = ["1A", "1B", "1C", "1D", "1E", "1F", "1G", "1H", "1I", "1J"].slice(0, MAX_SEATS_PER_ORDER);
    expect(CheckoutRequestSchema.safeParse({ movieId: 1, seats }).success).toBe(true);
  });

  it("rejects duplicates and non-integer movie ids", () => {
    expect(CheckoutRequestSchema.safeParse({ movieId: 1, seats: ["1A", "1A"] }).success).toBe(false);
    expect(CheckoutRequestSchema.safeParse({ movieId: 1.5, seats: ["1A"] }).success).toBe(false);
  });
});

describe("formatPrice", () => {
  it("formats cents as dollars", () => {
    expect(formatPrice(TICKET_PRICE_CENTS * 3)).toBe("$36.00");
  });
});
