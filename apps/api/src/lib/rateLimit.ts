import type { RequestHandler } from "express";
import { HttpError } from "./errors";

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

/**
 * Fixed-window, per-IP limiter held in memory. Good enough for one small
 * server; a multi-instance deployment would need a shared store.
 */
export function rateLimit({ limit, windowMs, now = Date.now }: RateLimitOptions): RequestHandler {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return (req, _res, next) => {
    const time = now();
    // Drop expired windows as we go so the map can't grow without bound.
    for (const [key, window] of windows) if (window.resetAt <= time) windows.delete(key);

    const key = req.ip ?? "unknown";
    const window = windows.get(key) ?? { count: 0, resetAt: time + windowMs };
    window.count += 1;
    windows.set(key, window);

    if (window.count > limit) {
      const retryAfter = Math.ceil((window.resetAt - time) / 1000);
      next(
        new HttpError(429, "rate_limited", "Too many requests. Please try again later.", {
          "Retry-After": String(retryAfter),
        }),
      );
      return;
    }
    next();
  };
}
