import { ContactRequestSchema } from "@portfolio/shared";
import { Router } from "express";
import type { Mailer } from "../clients/mailer";
import { notConfigured, parseInput } from "../lib/errors";
import { rateLimit } from "../lib/rateLimit";

interface ContactDeps {
  mailer: Mailer | undefined;
  limit?: { limit: number; windowMs: number; now?: () => number } | undefined;
}

export function contactRouter({ mailer, limit }: ContactDeps): Router {
  const router = Router();

  router.post(
    "/contact",
    rateLimit(limit ?? { limit: 5, windowMs: 60 * 60 * 1000 }),
    async (req, res) => {
      if (!mailer) throw notConfigured("The contact form");
      const message = parseInput(ContactRequestSchema, req.body);

      // Honeypot filled: almost certainly a bot. Answer like a success so it
      // learns nothing, but send nothing.
      if (message.website) {
        res.status(202).json({ ok: true });
        return;
      }

      await mailer.sendContact(message);
      res.status(202).json({ ok: true });
    },
  );

  return router;
}
