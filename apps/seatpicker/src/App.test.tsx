import type { CheckoutSummary, Movie } from "@portfolio/shared";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import { browser } from "./api";
import { AppRoutes } from "./App";

const MOVIES: Movie[] = [
  { id: 101, title: "Future City", posterUrl: "https://image.tmdb.org/t/p/w500/a.jpg" },
  { id: 202, title: "Prank War", posterUrl: "https://image.tmdb.org/t/p/w500/b.jpg" },
  { id: 303, title: "The Last Hero", posterUrl: "https://image.tmdb.org/t/p/w500/c.jpg" },
  { id: 404, title: "Urban Reckoning", posterUrl: "https://image.tmdb.org/t/p/w500/d.jpg" },
];

const PAID: CheckoutSummary = {
  status: "complete",
  paid: true,
  movieTitle: "Future City",
  seats: ["5E", "5F"],
  amountTotalCents: 2400,
  currency: "usd",
};

type Handler = (url: URL, init?: RequestInit) => Promise<Response>;

function stubApi(routes: Record<string, Handler> = {}) {
  const fetchFn = vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), "http://localhost");
    const key = `${init?.method ?? "GET"} ${url.pathname.replace(/\/cs_[^/]+$/, "/:id")}`;
    const handler: Handler =
      routes[key] ??
      (key === "GET /api/v1/movies"
        ? () => Promise.resolve(Response.json(MOVIES))
        : () => Promise.resolve(Response.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 })));
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

/** Renders the router's current path, so tests can check the URL. */
function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}

const currentPath = () => screen.getByTestId("location").textContent;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const seat = (name: string) => screen.getByRole("button", { name });
const selectedSeats = () =>
  within(screen.getByRole("list", { name: "Selected seats" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);

describe("movies", () => {
  it("lists today's movies as links to their seat maps", async () => {
    stubApi();
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1, name: "Choose a movie" })).toBeTruthy();
    const link = await screen.findByRole("link", { name: "Future City" });
    expect(link.getAttribute("href")).toBe("/seats?movie=101");
    expect(screen.getAllByRole("link", { name: /City|War|Hero|Reckoning/ })).toHaveLength(4);
    expect(screen.getByRole("listitem", { current: "step" }).textContent).toBe("1. Movie");
  });

  it("shows the server's message and retries", async () => {
    let down = true;
    stubApi({
      "GET /api/v1/movies": () =>
        Promise.resolve(
          down
            ? Response.json({ error: { code: "upstream_error", message: "TMDB is unavailable right now." } }, { status: 502 })
            : Response.json(MOVIES),
        ),
    });
    renderAt("/");
    expect((await screen.findByRole("alert")).textContent).toContain("TMDB is unavailable right now.");
    down = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link", { name: "Prank War" })).toBeTruthy();
  });
});

describe("seats", () => {
  it("toggles seats, keeps them in the URL, and prices the order", async () => {
    stubApi();
    renderAt("/seats?movie=101");
    expect(await screen.findByText("Future City")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Row \d+, seat [A-J]$/ })).toHaveLength(100);
    expect(screen.getByRole("button", { name: "Continue to payment" })).toHaveProperty("disabled", true);

    fireEvent.click(seat("Row 5, seat F"));
    fireEvent.click(seat("Row 5, seat E"));
    expect(seat("Row 5, seat E").getAttribute("aria-pressed")).toBe("true");
    expect(selectedSeats()).toEqual(["5E", "5F"]);
    expect(currentPath()).toBe("/seats?movie=101&seats=5E,5F");
    expect(screen.getByText("$24.00")).toBeTruthy();

    fireEvent.click(seat("Row 5, seat F"));
    expect(selectedSeats()).toEqual(["5E"]);
    expect(currentPath()).toBe("/seats?movie=101&seats=5E");

    const next = screen.getByRole("link", { name: "Continue to payment" });
    expect(next.getAttribute("href")).toBe("/checkout?movie=101&seats=5E");
  });

  it("keeps every seat when clicks land before the URL updates", async () => {
    stubApi();
    renderAt("/seats?movie=101");
    await screen.findByText("Future City");
    // One batch: the second click runs before the first click's navigation lands.
    act(() => {
      seat("Row 5, seat E").click();
      seat("Row 5, seat F").click();
      seat("Row 6, seat A").click();
    });
    expect(currentPath()).toBe("/seats?movie=101&seats=5E,5F,6A");
  });

  it("restores the selection from the URL, dropping invalid seats", async () => {
    stubApi();
    renderAt("/seats?movie=101&seats=2B,99Z,1A,2B");
    await screen.findByText("Future City");
    expect(selectedSeats()).toEqual(["1A", "2B"]);
    expect(seat("Row 1, seat A").getAttribute("aria-pressed")).toBe("true");
  });

  it("disables the other seats at the 10-seat limit", async () => {
    stubApi();
    renderAt("/seats?movie=101&seats=1A,1B,1C,1D,1E,1F,1G,1H,1I");
    await screen.findByText("Future City");
    fireEvent.click(seat("Row 1, seat J"));
    expect(selectedSeats()).toHaveLength(10);
    expect(seat("Row 2, seat A")).toHaveProperty("disabled", true);
    expect(seat("Row 1, seat A")).toHaveProperty("disabled", false);
    expect(screen.getByText(/limit of 10 seats/)).toBeTruthy();

    fireEvent.click(seat("Row 1, seat A"));
    expect(seat("Row 2, seat A")).toHaveProperty("disabled", false);
  });

  it("clears the selection", async () => {
    stubApi();
    renderAt("/seats?movie=101&seats=1A,1B");
    await screen.findByText("Future City");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(currentPath()).toBe("/seats?movie=101");
    expect(screen.getByText(/No seats yet/)).toBeTruthy();
  });

  it.each(["/seats?movie=999", "/seats", "/seats?movie=abc"])("explains a movie that isn't showing: %s", async (path) => {
    stubApi();
    renderAt(path);
    expect(await screen.findByRole("heading", { name: "That movie isn't showing" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "See what's showing" }).getAttribute("href")).toBe("/");
  });
});

describe("checkout", () => {
  it("sends only the movie id and seats, then goes to Stripe", async () => {
    const assign = vi.spyOn(browser, "assign").mockImplementation(() => undefined);
    const fetchFn = stubApi({
      "POST /api/v1/checkout": () =>
        Promise.resolve(Response.json({ url: "https://checkout.stripe.com/c/pay/cs_test_abc" }, { status: 201 })),
    });
    renderAt("/checkout?movie=101&seats=5F,5E");

    expect(await screen.findByRole("heading", { level: 2, name: "Future City" })).toBeTruthy();
    expect(screen.getByText("5E, 5F")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Pay \$24\.00 with Stripe/ }));
    expect(screen.getByRole("button", { name: /Opening Stripe/ })).toHaveProperty("disabled", true);

    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_test_abc");
    });
    const post = fetchFn.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({ movieId: 101, seats: ["5E", "5F"] });
  });

  it("shows the server's reason when checkout is refused, and allows another try", async () => {
    stubApi({
      "POST /api/v1/checkout": () =>
        Promise.resolve(
          Response.json(
            { error: { code: "unknown_movie", message: "That movie is no longer showing. Please pick another." } },
            { status: 400 },
          ),
        ),
    });
    renderAt("/checkout?movie=101&seats=1A");
    fireEvent.click(await screen.findByRole("button", { name: /Pay \$12\.00/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("That movie is no longer showing.");
    expect(screen.getByRole("button", { name: /Pay \$12\.00/ })).toHaveProperty("disabled", false);
  });

  it("asks for seats first when there are none", () => {
    stubApi();
    renderAt("/checkout?movie=101");
    expect(screen.getByRole("heading", { name: "No seats picked" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Pick seats" }).getAttribute("href")).toBe("/seats?movie=101");
  });

  it("links back to the seat map with the selection", async () => {
    stubApi();
    renderAt("/checkout?movie=101&seats=1A");
    const back = await screen.findByRole("link", { name: "Change seats" });
    expect(back.getAttribute("href")).toBe("/seats?movie=101&seats=1A");
  });
});

describe("after Stripe", () => {
  it("shows the paid booking", async () => {
    const fetchFn = stubApi({ "GET /api/v1/checkout/:id": () => Promise.resolve(Response.json(PAID)) });
    renderAt("/success?session_id=cs_test_abc123");
    expect(await screen.findByRole("heading", { name: "You're booked" })).toBeTruthy();
    expect(screen.getByText("5E, 5F")).toBeTruthy();
    expect(screen.getByText("$24.00")).toBeTruthy();
    expect(fetchFn.mock.calls.some(([input]) => input === "/api/v1/checkout/cs_test_abc123")).toBe(true);
  });

  it("says when the payment didn't go through", async () => {
    stubApi({
      "GET /api/v1/checkout/:id": () => Promise.resolve(Response.json({ ...PAID, status: "expired", paid: false })),
    });
    renderAt("/success?session_id=cs_test_abc123");
    expect(await screen.findByRole("heading", { name: "Payment not completed" })).toBeTruthy();
    expect(screen.getByText(/expired before payment/)).toBeTruthy();
  });

  it.each(["/success", "/success?session_id=../../etc", "/success?session_id=pi_123"])(
    "rejects a missing or malformed session id without calling the API: %s",
    (path) => {
      const fetchFn = stubApi();
      renderAt(path);
      expect(screen.getByRole("heading", { name: "No booking to show" })).toBeTruthy();
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );

  it("brings the seats back after a cancelled checkout", () => {
    stubApi();
    renderAt("/cancel?movie=101&seats=5E,5F");
    expect(screen.getByText(/Nothing was charged\. Your seats \(5E, 5F\) are still selected\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to your seats" }).getAttribute("href")).toBe("/seats?movie=101&seats=5E,5F");
  });

  it("has a not-found page", () => {
    stubApi();
    renderAt("/nope");
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
  });
});

describe("accessibility", () => {
  it.each(["light", "dark"] as const)("the seat map has no axe violations in %s mode", async (mode) => {
    stubApi();
    document.documentElement.classList.toggle("dark", mode === "dark");
    const { container } = renderAt("/seats?movie=101&seats=1A,1B,1C,1D,1E,1F,1G,1H,1I,1J");
    await screen.findByText("Future City");
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
