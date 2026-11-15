import { z } from "zod";

export const SEAT_ROWS = 10;
export const SEAT_COLUMNS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;
export type SeatColumn = (typeof SEAT_COLUMNS)[number];
/** Row number then column letter: "1A" … "10J". */
export type SeatId = `${number}${SeatColumn}`;

export const MAX_SEATS_PER_ORDER = 10;
/** Single source of truth for the price shown and the price charged. */
export const TICKET_PRICE_CENTS = 1200;
export const CURRENCY = "usd";

const SEAT_ID_PATTERN = /^(10|[1-9])[A-J]$/;

export function isSeatId(value: string): value is SeatId {
  return SEAT_ID_PATTERN.test(value);
}

export const SeatIdSchema = z
  .string()
  .regex(SEAT_ID_PATTERN, "Unknown seat")
  .transform((value) => value as SeatId);

export const MovieSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  posterUrl: z.url(),
});
export type Movie = z.infer<typeof MovieSchema>;

export const MovieListSchema = z.array(MovieSchema);

export const CheckoutRequestSchema = z.object({
  movieId: z.number().int().positive(),
  seats: z
    .array(SeatIdSchema)
    .min(1, "Pick at least one seat.")
    .max(MAX_SEATS_PER_ORDER, `You can book up to ${String(MAX_SEATS_PER_ORDER)} seats per order.`)
    .refine((seats) => new Set(seats).size === seats.length, "Each seat can only be picked once."),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export const CheckoutResponseSchema = z.object({
  url: z.url(),
});
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;

/** Stripe Checkout session ids look like cs_test_… / cs_live_…. */
export const CheckoutSessionIdSchema = z.string().regex(/^cs_(test|live)_[A-Za-z0-9]+$/, "Invalid session id");

/** What the success page shows about a finished checkout. */
export const CheckoutSummarySchema = z.object({
  status: z.enum(["open", "complete", "expired"]),
  paid: z.boolean(),
  movieTitle: z.string(),
  seats: z.array(SeatIdSchema),
  amountTotalCents: z.number().int().nonnegative(),
  currency: z.string(),
});
export type CheckoutSummary = z.infer<typeof CheckoutSummarySchema>;

export function formatPrice(cents: number, currency: string = CURRENCY): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}
