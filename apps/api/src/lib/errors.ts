import type { ApiError } from "@portfolio/shared";
import type { z } from "zod";

/** An error with a status and a message that is safe to show the client. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly headers: Record<string, string> = {},
    /** Extra machine-readable fields for the error body, e.g. which seats were taken. */
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "HttpError";
  }

  toBody(): ApiError {
    return { error: { ...this.details, code: this.code, message: this.message } };
  }
}

/** A third-party API failed or answered with something unexpected. */
export class UpstreamError extends HttpError {
  constructor(
    readonly upstream: string,
    readonly detail: string,
  ) {
    super(502, "upstream_error", `${upstream} is unavailable right now. Please try again shortly.`);
    this.name = "UpstreamError";
  }
}

export const notConfigured = (feature: string) =>
  new HttpError(503, "not_configured", `${feature} is not configured on this server.`);

/** Parses untrusted input, turning the first problem into a 400. */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue?.path.join(".");
  const message = issue ? `${field ? `${field}: ` : ""}${issue.message}` : "Invalid request";
  throw new HttpError(400, "invalid_request", message);
}
