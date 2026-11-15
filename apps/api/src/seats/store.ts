import { isSeatId, type SeatId } from "@portfolio/shared";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * One row per taken seat. The primary key (showing, seat) is what makes double
 * booking impossible: a second hold on the same seat can't be inserted, however
 * close together the two requests arrive.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS seat_holds (
    showing    TEXT    NOT NULL,
    seat       TEXT    NOT NULL,
    hold_id    TEXT    NOT NULL,
    owner      TEXT    NOT NULL,
    status     TEXT    NOT NULL CHECK (status IN ('held', 'sold')),
    session_id TEXT,
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (showing, seat)
  );
  CREATE INDEX IF NOT EXISTS seat_holds_hold ON seat_holds (hold_id);
  CREATE INDEX IF NOT EXISTS seat_holds_session ON seat_holds (session_id);
`;

export interface Hold {
  holdId: string;
  sessionId: string | null;
}

export interface SeatStore {
  /** Seats sold or held for a showing, leaving out `exceptOwner`'s own unpaid holds. */
  takenSeats(showing: string, exceptOwner?: string): SeatId[];
  /** Holds every seat or none. On conflict, says which seats were already taken. */
  hold(input: {
    holdId: string;
    showing: string;
    seats: readonly SeatId[];
    owner: string;
    expiresAt: number;
  }): { ok: true } | { ok: false; taken: SeatId[] };
  /** False when the hold is gone (released by a newer checkout meanwhile). */
  attachSession(holdId: string, sessionId: string): boolean;
  holdForSession(sessionId: string): string | undefined;
  markSold(holdId: string): void;
  release(holdId: string): void;
  /** Unpaid holds belonging to `owner`. */
  pendingHolds(owner: string): Hold[];
  /** Unpaid holds whose time ran out and still need resolving. */
  expiredHolds(now: number): Hold[];
  /** Daily reset: drops every row for showings dated before `date` (YYYY-MM-DD). */
  deleteShowingsBefore(date: string): number;
  close(): void;
}

/** Opens (and creates if needed) the store. Use ":memory:" for tests. */
export function openSeatStore(path: string): SeatStore {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);

  const statements = {
    taken: db.prepare(
      `SELECT seat FROM seat_holds
       WHERE showing = :showing AND (status = 'sold' OR owner IS NOT :owner)`,
    ),
    takenAmong: db.prepare(
      `SELECT seat FROM seat_holds WHERE showing = :showing AND seat IN (SELECT value FROM json_each(:seats))`,
    ),
    insert: db.prepare(
      `INSERT INTO seat_holds (showing, seat, hold_id, owner, status, expires_at)
       VALUES (:showing, :seat, :holdId, :owner, 'held', :expiresAt)`,
    ),
    attach: db.prepare(`UPDATE seat_holds SET session_id = :sessionId WHERE hold_id = :holdId`),
    bySession: db.prepare(`SELECT hold_id FROM seat_holds WHERE session_id = :sessionId LIMIT 1`),
    sold: db.prepare(`UPDATE seat_holds SET status = 'sold' WHERE hold_id = :holdId`),
    release: db.prepare(`DELETE FROM seat_holds WHERE hold_id = :holdId AND status = 'held'`),
    pending: db.prepare(
      `SELECT DISTINCT hold_id, session_id FROM seat_holds WHERE owner = :owner AND status = 'held'`,
    ),
    expired: db.prepare(
      `SELECT DISTINCT hold_id, session_id FROM seat_holds WHERE status = 'held' AND expires_at <= :now`,
    ),
    purge: db.prepare(`DELETE FROM seat_holds WHERE substr(showing, instr(showing, '@') + 1) < :date`),
  };

  const seatsOf = (rows: Record<string, unknown>[]) =>
    rows.flatMap((row) => (typeof row.seat === "string" && isSeatId(row.seat) ? [row.seat] : []));
  const holdsOf = (rows: Record<string, unknown>[]): Hold[] =>
    rows.map((row) => ({
      holdId: String(row.hold_id),
      sessionId: typeof row.session_id === "string" ? row.session_id : null,
    }));

  return {
    takenSeats(showing, exceptOwner) {
      return seatsOf(statements.taken.all({ showing, owner: exceptOwner ?? null }));
    },

    hold({ holdId, showing, seats, owner, expiresAt }) {
      // Node runs this synchronously, so nothing interleaves between the check
      // and the inserts; the primary key is the backstop either way.
      db.exec("BEGIN IMMEDIATE");
      try {
        const taken = seatsOf(statements.takenAmong.all({ showing, seats: JSON.stringify(seats) }));
        if (taken.length > 0) {
          db.exec("ROLLBACK");
          return { ok: false, taken };
        }
        for (const seat of seats) statements.insert.run({ showing, seat, holdId, owner, expiresAt });
        db.exec("COMMIT");
        return { ok: true };
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },

    attachSession(holdId, sessionId) {
      return Number(statements.attach.run({ holdId, sessionId }).changes) > 0;
    },

    holdForSession(sessionId) {
      const row = statements.bySession.get({ sessionId });
      return row ? String(row.hold_id) : undefined;
    },

    markSold(holdId) {
      statements.sold.run({ holdId });
    },

    release(holdId) {
      statements.release.run({ holdId });
    },

    pendingHolds(owner) {
      return holdsOf(statements.pending.all({ owner }));
    },

    expiredHolds(now) {
      return holdsOf(statements.expired.all({ now }));
    },

    deleteShowingsBefore(date) {
      return Number(statements.purge.run({ date }).changes);
    },

    close() {
      db.close();
    },
  };
}
