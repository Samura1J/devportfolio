import { z } from "zod";

/** Every API base path lives here so frontends and backend agree. */
export const API_BASE = "/api/v1";

/** Error body returned by every non-2xx API response. */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
