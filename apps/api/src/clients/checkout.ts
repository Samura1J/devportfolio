import {
  CURRENCY,
  isSeatId,
  TICKET_PRICE_CENTS,
  type CheckoutSummary,
  type Movie,
  type SeatId,
} from "@portfolio/shared";
import Stripe from "stripe";
import { HttpError, UpstreamError } from "../lib/errors";

export interface CreateSessionInput {
  movie: Movie;
  seats: SeatId[];
  successUrl: string;
  cancelUrl: string;
  /** Our seat hold, so a webhook or a later lookup can find it. */
  holdId: string;
  /** When Stripe stops accepting payment, in ms. Stripe allows 30 minutes to 24 hours. */
  expiresAt: number;
}

/** The payment provider, behind an interface so routes can be tested with a fake. */
export interface CheckoutGateway {
  createSession(input: CreateSessionInput): Promise<{ id: string; url: string }>;
  getSummary(sessionId: string): Promise<CheckoutSummary>;
  /**
   * Stops an unpaid session from being paid, and says how it ended: "paid",
   * "unpaid" (expired, nothing owed), or "pending" when the buyer completed
   * checkout with a delayed method (a bank debit, say) that hasn't settled.
   */
  expireSession(sessionId: string): Promise<SessionOutcome>;
}

export type SessionOutcome = "paid" | "unpaid" | "pending";

const outcomeOf = (session: Stripe.Checkout.Session): SessionOutcome => {
  if (session.payment_status !== "unpaid") return "paid"; // "paid" or "no_payment_required"
  return session.status === "complete" ? "pending" : "unpaid";
};

/** What a verified Stripe webhook means for a seat hold, if anything. */
export type PaymentEvent = { kind: "paid" | "unpaid"; sessionId: string } | { kind: "ignored" };

/** The Stripe Checkout session for one order. */
export function sessionParams({
  movie,
  seats,
  successUrl,
  cancelUrl,
  holdId,
  expiresAt,
}: CreateSessionInput): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    // Cards only (wallets like Apple Pay and Google Pay count as cards): they
    // settle at once. Delayed methods such as bank debits would leave seats
    // held for days while the payment clears.
    allowed_payment_method_types: ["card"],
    // Price is built here from the shared constant: the client never sends one,
    // and no Stripe product/price objects pile up per checkout.
    line_items: [
      {
        quantity: seats.length,
        price_data: {
          currency: CURRENCY,
          unit_amount: TICKET_PRICE_CENTS,
          product_data: { name: `Ticket: ${movie.title}`, description: `Seats ${seats.join(", ")}` },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Stripe refuses payment after this, so the seat hold can end then too.
    expires_at: Math.floor(expiresAt / 1000),
    metadata: { movieId: String(movie.id), movieTitle: movie.title, seats: seats.join(","), holdId },
  };
}

export function createStripeGateway(secretKey: string): CheckoutGateway {
  const stripe = new Stripe(secretKey, { maxNetworkRetries: 1, timeout: 10_000 });

  return {
    async createSession(input) {
      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.create(sessionParams(input));
      } catch (error) {
        throw new UpstreamError("Stripe", errorDetail(error));
      }
      if (!session.url) throw new UpstreamError("Stripe", "session has no url");
      return { id: session.id, url: session.url };
    },

    async expireSession(sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.status === "open") {
          return outcomeOf(await stripe.checkout.sessions.expire(sessionId));
        }
        return outcomeOf(session);
      } catch (error) {
        throw new UpstreamError("Stripe", errorDetail(error));
      }
    },

    async getSummary(sessionId) {
      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
      } catch (error) {
        if (error instanceof Stripe.errors.StripeInvalidRequestError && error.statusCode === 404) {
          throw new HttpError(404, "not_found", "Checkout session not found.");
        }
        throw new UpstreamError("Stripe", errorDetail(error));
      }
      return {
        status: toStatus(session.status),
        paid: session.payment_status === "paid",
        movieTitle: session.metadata?.movieTitle ?? "",
        seats: (session.metadata?.seats ?? "").split(",").filter(isSeatId),
        amountTotalCents: session.amount_total ?? 0,
        currency: session.currency ?? CURRENCY,
      };
    },
  };
}

/**
 * Checks a webhook's signature and reduces it to what the seat store needs.
 * Only checkout events matter: paid (sell the seats) or over without payment
 * (release them). A bad signature throws.
 */
export function createWebhookVerifier(webhookSecret: string) {
  // Verification is local (an HMAC); this client never makes a request.
  const stripe = new Stripe("sk_test_webhook_verification_only");
  return (payload: Buffer, signature: string): PaymentEvent => {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    switch (event.type) {
      case "checkout.session.completed":
        // Card payments are paid on completion; delayed methods report later.
        return event.data.object.payment_status === "paid"
          ? { kind: "paid", sessionId: event.data.object.id }
          : { kind: "ignored" };
      case "checkout.session.async_payment_succeeded":
        return { kind: "paid", sessionId: event.data.object.id };
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        return { kind: "unpaid", sessionId: event.data.object.id };
      default:
        return { kind: "ignored" };
    }
  };
}

/** Stripe's type allows future status strings; anything unknown reads as "open". */
function toStatus(status: string | null): CheckoutSummary["status"] {
  switch (status) {
    case "complete":
      return "complete";
    case "expired":
      return "expired";
    default:
      return "open";
  }
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
