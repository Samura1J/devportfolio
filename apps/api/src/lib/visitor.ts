import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

/** Identifies one browser for seat holds. It carries no personal data: just a random id. */
export const VISITOR_COOKIE = "seat_visitor";

const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const cookieValue = (req: Request, name: string): string | undefined => {
  for (const part of (req.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.split("=");
    if (key?.trim() === name) return rest.join("=").trim();
  }
  return undefined;
};

/**
 * The visitor's id from their cookie, issuing a new one if it's missing or
 * malformed. Holds belong to this id rather than the IP, so people sharing a
 * network (an office, a campus) don't replace each other's checkouts.
 */
export function visitorId(req: Request, res: Response): string {
  const existing = cookieValue(req, VISITOR_COOKIE);
  if (existing && VISITOR_ID.test(existing)) return existing;

  const id = randomUUID();
  res.cookie(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    // HTTPS as the browser sees it: behind nginx, trust proxy reads X-Forwarded-Proto.
    secure: req.secure,
    path: "/api/v1",
    maxAge: DAY_MS, // showings reset daily, so a hold never needs the id for longer
  });
  return id;
}
