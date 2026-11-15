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
}

/** The payment provider, behind an interface so routes can be tested with a fake. */
export interface CheckoutGateway {
  createSession(input: CreateSessionInput): Promise<{ url: string }>;
  getSummary(sessionId: string): Promise<CheckoutSummary>;
}

export function createStripeGateway(secretKey: string): CheckoutGateway {
  const stripe = new Stripe(secretKey, { maxNetworkRetries: 1, timeout: 10_000 });

  return {
    async createSession({ movie, seats, successUrl, cancelUrl }) {
      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.create({
          mode: "payment",
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
          metadata: { movieId: String(movie.id), movieTitle: movie.title, seats: seats.join(",") },
        });
      } catch (error) {
        throw new UpstreamError("Stripe", errorDetail(error));
      }
      if (!session.url) throw new UpstreamError("Stripe", "session has no url");
      return { url: session.url };
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
