import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOVIES, fakeGateway } from "../test/fakes";
import { createBookings, SeatsTakenError, SESSION_MINUTES, showingFor } from "./bookings";
import { openSeatStore, type SeatStore } from "./store";

const MOVIE = MOVIES[0] ?? { id: 101, title: "Future City", posterUrl: "https://image.tmdb.org/t/p/w500/a.jpg" };
const URLS = { successUrl: "https://example.test/ok", cancelUrl: "https://example.test/cancel" };
const T0 = Date.parse("2026-11-15T12:00:00Z");
const MINUTE = 60 * 1000;

describe("seat store", () => {
  let store: SeatStore;
  beforeEach(() => {
    store = openSeatStore(":memory:");
  });
  afterEach(() => {
    store.close();
  });

  const hold = (holdId: string, seats: ("1A" | "1B" | "2A")[], owner = "alice", showing = "101@2026-11-15") =>
    store.hold({ holdId, showing, seats, owner, expiresAt: T0 + 30 * MINUTE });

  it("holds every seat or none, and reports which were taken", () => {
    expect(hold("h1", ["1A", "1B"])).toEqual({ ok: true });
    expect(hold("h2", ["2A", "1B"], "bob")).toEqual({ ok: false, taken: ["1B"] });
    expect(store.takenSeats("101@2026-11-15").sort()).toEqual(["1A", "1B"]); // 2A was not held
  });

  it("keeps showings apart", () => {
    hold("h1", ["1A"]);
    expect(hold("h2", ["1A"], "bob", "202@2026-11-15")).toEqual({ ok: true });
    expect(hold("h3", ["1A"], "bob", "101@2026-11-16")).toEqual({ ok: true });
  });

  it("leaves an owner's own unpaid hold out of their view, but never a sale", () => {
    hold("h1", ["1A"]);
    hold("h2", ["1B"]);
    store.markSold("h2");
    expect(store.takenSeats("101@2026-11-15", "alice")).toEqual(["1B"]);
    expect(store.takenSeats("101@2026-11-15", "bob").sort()).toEqual(["1A", "1B"]);
  });

  it("releases holds but never sales", () => {
    hold("h1", ["1A"]);
    store.markSold("h1");
    store.release("h1");
    expect(store.takenSeats("101@2026-11-15")).toEqual(["1A"]);
  });

  it("finds holds by session, by owner and by expiry", () => {
    hold("h1", ["1A", "1B"]);
    expect(store.attachSession("h1", "cs_test_1")).toBe(true);
    expect(store.attachSession("gone", "cs_test_2")).toBe(false);
    expect(store.holdForSession("cs_test_1")).toBe("h1");
    expect(store.pendingHolds("alice")).toEqual([{ holdId: "h1", sessionId: "cs_test_1" }]);
    expect(store.expiredHolds(T0)).toEqual([]);
    expect(store.expiredHolds(T0 + 30 * MINUTE)).toEqual([{ holdId: "h1", sessionId: "cs_test_1" }]);
  });

  it("clears showings before a date", () => {
    hold("h1", ["1A"], "alice", "101@2026-11-14");
    hold("h2", ["1A"], "alice", "101@2026-11-15");
    expect(store.deleteShowingsBefore("2026-11-15")).toBe(1);
    expect(store.takenSeats("101@2026-11-14")).toEqual([]);
    expect(store.takenSeats("101@2026-11-15")).toEqual(["1A"]);
  });
});

describe("bookings", () => {
  let store: SeatStore;
  let now: number;
  const log = vi.fn();

  beforeEach(() => {
    store = openSeatStore(":memory:");
    now = T0;
    log.mockClear();
  });
  afterEach(() => {
    store.close();
  });

  const setup = (paid = new Set<string>()) => {
    const fake = fakeGateway(paid);
    const bookings = createBookings({ store, gateway: fake.gateway, now: () => now, log });
    const checkout = (seats: ("1A" | "1B" | "2A")[], owner: string) =>
      bookings.checkout({ movie: MOVIE, seats, owner, ...URLS });
    return { ...fake, bookings, checkout };
  };

  it("names a showing by movie and UTC day", () => {
    expect(showingFor(101, T0)).toBe("101@2026-11-15");
  });

  it("holds the seats, ties them to the Stripe session, and makes it expire", async () => {
    const { bookings, checkout, createSession } = setup();
    await checkout(["1A", "1B"], "alice");

    const input = createSession.mock.calls[0]?.[0];
    expect(input?.holdId).toMatch(/^[0-9a-f-]{36}$/);
    expect(input?.expiresAt).toBe(T0 + SESSION_MINUTES * MINUTE);
    expect(store.holdForSession("cs_test_1")).toBe(input?.holdId);
    expect((await bookings.takenSeats(MOVIE.id, "bob")).sort()).toEqual(["1A", "1B"]);
  });

  it("refuses a seat someone else holds, naming it, without calling Stripe", async () => {
    const { checkout, createSession } = setup();
    await checkout(["1A", "1B"], "alice");
    const attempt = checkout(["2A", "1B"], "bob");
    await expect(attempt).rejects.toBeInstanceOf(SeatsTakenError);
    await expect(attempt).rejects.toMatchObject({ status: 409, seats: ["1B"] });
    expect(createSession).toHaveBeenCalledOnce();
  });

  it("lets only one of two simultaneous checkouts for a seat through", async () => {
    const { checkout } = setup();
    const results = await Promise.allSettled([checkout(["1A"], "alice"), checkout(["1A"], "bob")]);
    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
  });

  it("replaces a visitor's earlier unpaid checkout, expiring it at Stripe first", async () => {
    const { checkout, expireSession, bookings } = setup();
    await checkout(["1A", "1B"], "alice");
    await checkout(["1B", "2A"], "alice"); // went back and changed seats

    expect(expireSession).toHaveBeenCalledWith("cs_test_1");
    expect((await bookings.takenSeats(MOVIE.id, "bob")).sort()).toEqual(["1B", "2A"]);
  });

  it("keeps the earlier seats if that checkout turns out to be paid", async () => {
    const { checkout, bookings } = setup(new Set(["cs_test_1"]));
    await checkout(["1A"], "alice");
    await checkout(["2A"], "alice");
    expect((await bookings.takenSeats(MOVIE.id, "alice")).sort()).toEqual(["1A"]); // sold; own hold 2A hidden
    expect((await bookings.takenSeats(MOVIE.id, "bob")).sort()).toEqual(["1A", "2A"]);
  });

  it("releases the hold when Stripe can't open a session", async () => {
    const { checkout, createSession, bookings } = setup();
    createSession.mockRejectedValueOnce(new Error("Stripe down"));
    await expect(checkout(["1A"], "alice")).rejects.toThrow("Stripe down");
    expect(await bookings.takenSeats(MOVIE.id, "bob")).toEqual([]);
  });

  it("expires the session if a newer checkout released the hold meanwhile", async () => {
    const { checkout, createSession, expireSession } = setup();
    let finishFirst: () => void = () => undefined;
    createSession.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = () => {
            resolve({ id: "cs_test_slow", url: "https://checkout.stripe.com/c/pay/cs_test_slow" });
          };
        }),
    );
    const first = checkout(["1A"], "alice");
    await vi.waitFor(() => {
      expect(createSession).toHaveBeenCalledOnce();
    });
    await checkout(["1B"], "alice"); // releases the first hold, which has no session yet
    finishFirst();
    await expect(first).rejects.toMatchObject({ status: 409, code: "checkout_replaced" });
    expect(expireSession).toHaveBeenCalledWith("cs_test_slow");
  });

  it("settles from payment news: paid seats are sold, unpaid ones freed", async () => {
    const { checkout, bookings } = setup();
    await checkout(["1A"], "alice");
    await checkout(["1B"], "bob");
    bookings.settle("cs_test_1", true);
    bookings.settle("cs_test_2", false);
    bookings.settle("cs_test_unknown", true); // not ours: ignored
    expect(await bookings.takenSeats(MOVIE.id, "alice")).toEqual(["1A"]);
  });

  it("resolves expired holds with Stripe when no webhook came", async () => {
    const { checkout, bookings, expireSession } = setup(new Set(["cs_test_1"]));
    await checkout(["1A"], "alice"); // paid, but the webhook never arrived
    await checkout(["1B"], "bob"); // abandoned
    now += 40 * MINUTE;

    expect(await bookings.takenSeats(MOVIE.id, "carol")).toEqual(["1A"]);
    expect(expireSession).toHaveBeenCalledTimes(2);
    await bookings.takenSeats(MOVIE.id, "carol");
    expect(expireSession).toHaveBeenCalledTimes(2); // resolved once
  });

  it("keeps an expired hold taken while Stripe can't be reached", async () => {
    const { checkout, bookings, expireSession } = setup();
    await checkout(["1A"], "alice");
    now += 40 * MINUTE;
    expireSession.mockRejectedValueOnce(new Error("Stripe down"));
    expect(await bookings.takenSeats(MOVIE.id, "bob")).toEqual(["1A"]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("Could not resolve expired hold"));
    expect(await bookings.takenSeats(MOVIE.id, "bob")).toEqual([]); // next try succeeds
  });

  it("starts each day with an empty theater and clears old sales", async () => {
    const { checkout, bookings } = setup();
    await checkout(["1A"], "alice");
    bookings.settle("cs_test_1", true);
    now += 24 * 60 * MINUTE;
    expect(await bookings.takenSeats(MOVIE.id, "bob")).toEqual([]);
    expect(store.takenSeats("101@2026-11-15")).toEqual(["1A"]);
    now += 24 * 60 * MINUTE;
    await bookings.sweep();
    expect(store.takenSeats("101@2026-11-15")).toEqual([]);
  });
});
