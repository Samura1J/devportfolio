import { z } from "zod";

export const INQUIRY_TYPES = ["full-time", "contract", "consultation", "networking"] as const;
export const InquiryTypeSchema = z.enum(INQUIRY_TYPES);
export type InquiryType = z.infer<typeof InquiryTypeSchema>;

export const CONTACT_MESSAGE_MIN = 20;
export const CONTACT_MESSAGE_MAX = 5000;

/** Body of POST /api/v1/contact. The form and the API validate with the same schema. */
export const ContactRequestSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100, "Please keep your name under 100 characters."),
  email: z.email("Please enter a valid email address.").max(254),
  inquiryType: InquiryTypeSchema,
  message: z
    .string()
    .trim()
    .min(CONTACT_MESSAGE_MIN, `Please write at least ${String(CONTACT_MESSAGE_MIN)} characters.`)
    .max(CONTACT_MESSAGE_MAX, `Please keep it under ${String(CONTACT_MESSAGE_MAX)} characters.`),
  /**
   * Honeypot: hidden from people, often filled by bots. The API accepts the
   * request but silently drops it when non-empty, so bots get no signal.
   */
  website: z.string().max(500).optional(),
});
export type ContactRequest = z.infer<typeof ContactRequestSchema>;
