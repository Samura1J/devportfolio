import express, { Router } from "express";
import type { PaymentEvent } from "../clients/checkout";
import { HttpError, notConfigured } from "../lib/errors";
import type { Bookings } from "../seats/bookings";

export type WebhookVerifier = (payload: Buffer, signature: string) => PaymentEvent;

interface WebhookDeps {
  verify: WebhookVerifier | undefined;
  bookings: Bookings | undefined;
}

/**
 * POST /stripe/webhook. Stripe signs the exact bytes it sends, so this route
 * reads the raw body and must be mounted before any JSON parser.
 */
export function stripeWebhookRouter({ verify, bookings }: WebhookDeps): Router {
  const router = Router();

  router.post("/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), (req, res) => {
    if (!verify || !bookings) throw notConfigured("Payment webhooks");
    const signature = req.get("stripe-signature");
    if (!signature || !Buffer.isBuffer(req.body)) {
      throw new HttpError(400, "invalid_signature", "Missing Stripe signature.");
    }

    let event: PaymentEvent;
    try {
      event = verify(req.body, signature);
    } catch {
      throw new HttpError(400, "invalid_signature", "Invalid Stripe signature.");
    }

    if (event.kind !== "ignored") bookings.settle(event.sessionId, event.kind === "paid");
    res.json({ received: true });
  });

  return router;
}
