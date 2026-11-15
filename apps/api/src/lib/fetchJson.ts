import type { z } from "zod";
import { UpstreamError } from "./errors";

export type FetchFn = typeof fetch;

interface FetchJsonOptions<T extends z.ZodType> {
  /** Short service name for errors and logs, e.g. "TMDB". */
  upstream: string;
  schema: T;
  init?: RequestInit;
  timeoutMs?: number;
  fetchFn?: FetchFn;
}

/**
 * GETs (or sends `init`) and validates JSON from a third-party API. Every
 * failure — network, timeout, non-2xx, bad JSON, unexpected shape — becomes an
 * UpstreamError, so routes answer 502 without leaking upstream details.
 */
export async function fetchJson<T extends z.ZodType>(
  url: string | URL,
  { upstream, schema, init, timeoutMs = 8000, fetchFn = fetch }: FetchJsonOptions<T>,
): Promise<z.infer<T>> {
  let res: Response;
  try {
    res = await fetchFn(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new UpstreamError(upstream, `request failed: ${String(error)}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new UpstreamError(upstream, `HTTP ${String(res.status)}: ${body.slice(0, 300)}`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new UpstreamError(upstream, "response was not JSON");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new UpstreamError(upstream, `unexpected response shape: ${parsed.error.message.slice(0, 300)}`);
  }
  return parsed.data;
}
