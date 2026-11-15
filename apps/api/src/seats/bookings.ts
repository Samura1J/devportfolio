import type { Movie, SeatId } from "@portfolio/shared";
import { randomUUID } from "node:crypto";
import type { CheckoutGateway } from "../clients/checkout";
import { HttpError } from "../lib/errors";
import type { SeatStore } from "./store";

/** Stripe's shortest allowed session life is 30 minutes; a minute's margin covers clock skew. */
export const SESSION_MINUTES = 31;
/** Holds outlive their session briefly, so a late webhook still finds them. */
const HOLD_GRACE_MS = 2 * 60 * 1000;
/** Sold seats are kept for a day after their showing, then cleared. */
const KEEP_DAYS = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

const utcDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** One theater per movie per (UTC) day: the map resets daily, so the demo never sells out for good. */
export const showingFor = (movieId: number, now: number) => `${String(movieId)}@${utcDate(now)}`;

export interface CheckoutInput {
  movie: Movie;
  seats: SeatId[];
  /** Who is buying: the client IP. One unpaid checkout per owner at a time. */
  owner: string;
  successUrl: string;
  cancelUrl: string;
}

export interface Bookings {
  /** Seats nobody else can pick right now. Your own unpaid hold doesn't count. */
  takenSeats(movieId: number, owner: string): Promise<SeatId[]>;
  /** Holds the seats, then opens a Stripe session. 409 if any seat is taken. */
  checkout(input: CheckoutInput): Promise<{ url: string }>;
  /** Payment news from a webhook or a session lookup. */
  settle(sessionId: string, paid: boolean): void;
  /** Resolves expired holds and clears old showings; run on a timer. */
  sweep(): Promise<void>;
}

export class SeatsTakenError extends HttpError {
  constructor(readonly seats: SeatId[]) {
    const list = seats.join(", ");
    super(
      409,
      "seats_taken",
      seats.length === 1
        ? `Seat ${list} was just taken by someone else. Please pick another.`
        : `Seats ${list} were just taken by someone else. Please pick others.`,
      {},
      { seats },
    );
    this.name = "SeatsTakenError";
  }
}

interface BookingsOptions {
  store: SeatStore;
  gateway: CheckoutGateway;
  now?: () => number;
  log?: (message: string) => void;
}

export function createBookings({ store, gateway, now = Date.now, log = console.warn }: BookingsOptions): Bookings {
  /** Ends a hold based on what Stripe says: sold if paid, otherwise released. */
  const resolveWithStripe = async (holdId: string, sessionId: string | null) => {
    if (!sessionId) {
      store.release(holdId); // the session was never created
      return;
    }
    const { paid } = await gateway.expireSession(sessionId);
    if (paid) store.markSold(holdId);
    else store.release(holdId);
  };

  // One reconciliation at a time; callers arriving meanwhile share it.
  let reconciling: Promise<void> | undefined;
  const reconcileExpired = () => {
    reconciling ??= (async () => {
      for (const { holdId, sessionId } of store.expiredHolds(now())) {
        try {
          await resolveWithStripe(holdId, sessionId);
        } catch (error) {
          // Leave the seats taken: freeing a seat that might be paid is worse.
          log(`Could not resolve expired hold ${holdId}: ${String(error)}`);
        }
      }
    })().finally(() => {
      reconciling = undefined;
    });
    return reconciling;
  };

  return {
    async takenSeats(movieId, owner) {
      await reconcileExpired();
      return store.takenSeats(showingFor(movieId, now()), owner);
    },

    async checkout({ movie, seats, owner, successUrl, cancelUrl }) {
      await reconcileExpired();

      // A visitor going back to change seats shouldn't be blocked by their own
      // earlier checkout. Expire it at Stripe first, so it can't be paid after
      // its seats are released.
      for (const { holdId, sessionId } of store.pendingHolds(owner)) {
        await resolveWithStripe(holdId, sessionId);
      }

      const holdId = randomUUID();
      const sessionExpiresAt = now() + SESSION_MINUTES * 60 * 1000;
      const held = store.hold({
        holdId,
        showing: showingFor(movie.id, now()),
        seats,
        owner,
        expiresAt: sessionExpiresAt + HOLD_GRACE_MS,
      });
      if (!held.ok) throw new SeatsTakenError(held.taken);

      let session: { id: string; url: string };
      try {
        session = await gateway.createSession({ movie, seats, successUrl, cancelUrl, holdId, expiresAt: sessionExpiresAt });
      } catch (error) {
        store.release(holdId);
        throw error;
      }
      if (!store.attachSession(holdId, session.id)) {
        // A newer checkout from this visitor released the hold while Stripe
        // was answering. Don't leave a payable session with no seats behind it.
        await gateway.expireSession(session.id);
        throw new HttpError(409, "checkout_replaced", "A newer checkout replaced this one. Please try again.");
      }
      return { url: session.url };
    },

    settle(sessionId, paid) {
      const holdId = store.holdForSession(sessionId);
      if (!holdId) return;
      if (paid) store.markSold(holdId);
      else store.release(holdId);
    },

    async sweep() {
      await reconcileExpired();
      const removed = store.deleteShowingsBefore(utcDate(now() - KEEP_DAYS * DAY_MS));
      if (removed > 0) log(`Cleared ${String(removed)} seats from past showings`);
    },
  };
}
