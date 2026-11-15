import type { ContactRequest } from "@portfolio/shared";
import { z } from "zod";
import { fetchJson, type FetchFn } from "../lib/fetchJson";

export interface Mailer {
  sendContact(message: ContactRequest): Promise<void>;
}

interface ResendOptions {
  apiKey: string;
  to: string;
  from: string;
  fetchFn?: FetchFn;
}

/** Sends contact-form messages through Resend's HTTP API (no SDK needed). */
export function createResendMailer({ apiKey, to, from, fetchFn }: ResendOptions): Mailer {
  return {
    async sendContact(message) {
      await fetchJson("https://api.resend.com/emails", {
        upstream: "Email",
        schema: z.object({ id: z.string() }),
        init: {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: [to],
            reply_to: message.email,
            subject: `Portfolio inquiry (${message.inquiryType}) from ${message.name}`,
            text: [
              `Name: ${message.name}`,
              `Email: ${message.email}`,
              `Inquiry: ${message.inquiryType}`,
              "",
              message.message,
            ].join("\n"),
          }),
        },
        ...(fetchFn ? { fetchFn } : {}),
      });
    },
  };
}
