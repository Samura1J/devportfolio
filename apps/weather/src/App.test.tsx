import type { ForecastResponse, Location } from "@portfolio/shared";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

const FORECAST: ForecastResponse = {
  days: [
    { date: "2026-11-15", condition: "lightrain", label: "Patchy rain nearby", highC: 9, lowC: 1, highF: 49, lowF: 35, chanceOfRain: 53 },
    { date: "2026-11-16", condition: "clear", label: "Sunny", highC: 11, lowC: 3, highF: 52, lowF: 37, chanceOfRain: 0 },
    { date: "2026-11-17", condition: "tsrain", label: "Thundery outbreaks", highC: 7, lowC: -2, highF: 45, lowF: 28, chanceOfRain: 80 },
  ],
};

const TOKYO: Location = { name: "Tokyo", region: "Tokyo", country: "Japan", lat: 35.69, lon: 139.69 };
const AMSTERDAM_NY: Location = { name: "Amsterdam", region: "New York", country: "United States of America", lat: 42.94, lon: -74.19 };
const AMSTERDAM_NL: Location = { name: "Amsterdam", region: "North Holland", country: "Netherlands", lat: 52.37, lon: 4.89 };

type Input = string | URL | Request;
const toUrl = (input: Input | undefined) =>
  new URL(input instanceof Request ? input.url : String(input), "http://localhost");

interface FakeApi {
  forecast?: (url: URL) => Promise<Response>;
  search?: (url: URL) => Promise<Response>;
}

function stubApi({
  forecast = () => Promise.resolve(Response.json(FORECAST)),
  search = (url) =>
    Promise.resolve(Response.json(url.searchParams.get("q")?.startsWith("tok") ? [TOKYO] : [AMSTERDAM_NL, AMSTERDAM_NY])),
}: FakeApi = {}) {
  const fetchFn = vi.fn((input: Input, _init?: RequestInit) => {
    const url = toUrl(input);
    return url.pathname === "/api/v1/weather/search" ? search(url) : forecast(url);
  });
  vi.stubGlobal("fetch", fetchFn);
  const calls = (path: string) => fetchFn.mock.calls.map(([input]) => toUrl(input)).filter((u) => u.pathname === path);
  return { fetchFn, forecasts: () => calls("/api/v1/weather"), searches: () => calls("/api/v1/weather/search") };
}

const combobox = () => screen.getByRole("combobox", { name: "City" });
const inputValue = () => (combobox() as HTMLInputElement).value;
const optionNames = () => screen.getAllByRole("option").map((o) => o.textContent);
const cards = () => screen.getAllByRole("article");
const placeHeading = () => screen.getByRole("heading", { level: 2 }).textContent;
const type = (text: string) => {
  fireEvent.change(combobox(), { target: { value: text } });
};
const key = (k: string) => {
  fireEvent.keyDown(combobox(), { key: k });
};

describe("forecast", () => {
  it("shows a 3-day forecast for Amsterdam by default, with an icon per day", async () => {
    const api = stubApi();
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Sun, Nov 15" })).toBeTruthy();
    expect(cards()).toHaveLength(3);
    expect(placeHeading()).toBe("Amsterdam");
    expect(inputValue()).toBe("Amsterdam, Netherlands");

    const icons = screen.getAllByRole("img");
    expect(icons.map((icon) => icon.getAttribute("aria-label"))).toEqual(["Patchy rain nearby", "Sunny", "Thundery outbreaks"]);
    expect(icons.map((icon) => icon.dataset.condition)).toEqual(["lightrain", "clear", "tsrain"]);
    expect(icons[0]?.getAttribute("style")).toContain("images/lightrain.svg");

    const [url] = api.forecasts();
    expect(url?.searchParams.get("lat")).toBe("52.367");
    expect(url?.searchParams.get("lon")).toBe("4.904");
  });

  it("switches units without refetching, and remembers the choice", async () => {
    const api = stubApi();
    render(<App />);
    const first = () => within(cards()[0] ?? document.body);

    await screen.findAllByRole("article");
    expect(first().getByText("High").nextElementSibling?.textContent).toBe("9°C");

    fireEvent.click(screen.getByRole("button", { name: "Fahrenheit" }));
    expect(first().getByText("High").nextElementSibling?.textContent).toBe("49°F");
    expect(first().getByText("Low").nextElementSibling?.textContent).toBe("35°F");
    expect(screen.getByRole("button", { name: "Fahrenheit" }).getAttribute("aria-pressed")).toBe("true");
    expect(api.forecasts()).toHaveLength(1);
    expect(localStorage.getItem("weather-unit")).toBe("F");
  });

  it("aborts the previous forecast request when the place changes quickly", async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: Input, init?: RequestInit) => {
        if (init?.signal) signals.push(init.signal);
        return new Promise<Response>(() => undefined); // never settles
      }),
    );
    render(<App />);

    type("par");
    key("Enter");
    await act(() => Promise.resolve());
    expect(placeHeading()).toBe("Paris");
    expect(signals[0]?.aborted).toBe(true);
    expect(signals.at(-1)?.aborted).toBe(false);
  });

  it("shows the API's message when the service is down, and recovers on retry", async () => {
    let down = true;
    stubApi({
      forecast: () =>
        Promise.resolve(
          down
            ? Response.json(
                { error: { code: "upstream_error", message: "WeatherAPI is unavailable right now. Please try again shortly." } },
                { status: 502 },
              )
            : Response.json(FORECAST),
        ),
    });
    render(<App />);

    expect((await screen.findByRole("alert")).textContent).toContain("WeatherAPI is unavailable right now.");
    down = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findAllByRole("article")).toHaveLength(3);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("explains a network failure", async () => {
    stubApi({ forecast: () => Promise.reject(new TypeError("Failed to fetch")) });
    render(<App />);
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't reach the weather service");
  });

  it("rejects a malformed response instead of rendering it", async () => {
    stubApi({ forecast: () => Promise.resolve(Response.json({ days: [{ date: "soon" }] })) });
    render(<App />);
    expect((await screen.findByRole("alert")).textContent).toContain("couldn't be loaded");
  });
});

describe("place search", () => {
  it("filters built-in cities instantly and picks the highlighted one with Enter", async () => {
    const api = stubApi();
    render(<App />);
    await screen.findAllByRole("article");

    type("rey");
    expect(combobox().getAttribute("aria-expanded")).toBe("true");
    expect(optionNames()[0]).toBe("ReykjavíkIceland");
    const first = screen.getAllByRole("option")[0];
    expect(first?.getAttribute("aria-selected")).toBe("true");
    expect(combobox().getAttribute("aria-activedescendant")).toBe(first?.id);

    key("Enter");
    expect(placeHeading()).toBe("Reykjavík");
    expect(combobox().getAttribute("aria-expanded")).toBe("false");
    expect(inputValue()).toBe("Reykjavík, Iceland");
    expect(new URLSearchParams(window.location.search).get("city")).toBe("reykjavik");
    await screen.findAllByRole("article");
    expect(api.forecasts().at(-1)?.searchParams.get("lat")).toBe("64.146");
  });

  it("adds API results after a pause, without repeating built-in cities", async () => {
    const api = stubApi();
    render(<App />);
    await screen.findAllByRole("article");

    type("amsterdam");
    expect(optionNames()).toEqual(["AmsterdamNetherlands"]);
    expect(screen.getByText("Searching more places…", { selector: "p" })).toBeTruthy();
    await screen.findByText("New York, United States of America");
    // The Dutch search result is the built-in city, so it's listed once.
    expect(optionNames()).toEqual(["AmsterdamNetherlands", "AmsterdamNew York, United States of America"]);
    expect(api.searches().map((u) => u.searchParams.get("q"))).toEqual(["amsterdam"]);
  });

  it("chooses a search result with the arrow keys and keeps it in the URL", async () => {
    const api = stubApi();
    render(<App />);
    await screen.findAllByRole("article");

    type("tokyo");
    await screen.findByText("Japan");
    key("ArrowDown"); // one option, so it wraps back onto it
    key("Enter");

    expect(placeHeading()).toBe("Tokyo");
    expect(screen.getByText("Japan", { selector: "p" })).toBeTruthy();
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    expect(params).toEqual({ lat: "35.69", lon: "139.69", name: "Tokyo", country: "Japan", region: "Tokyo" });
    await screen.findAllByRole("article");
    expect(api.forecasts().at(-1)?.searchParams.get("lon")).toBe("139.69");
  });

  it("chooses with a click", async () => {
    stubApi();
    render(<App />);
    await screen.findAllByRole("article");

    type("par");
    fireEvent.click(screen.getByRole("option", { name: /^Paris/ }));
    expect(placeHeading()).toBe("Paris");
  });

  it("Escape closes the list, then restores the current place", async () => {
    stubApi();
    render(<App />);
    await screen.findAllByRole("article");

    type("ber");
    key("Escape");
    expect(combobox().getAttribute("aria-expanded")).toBe("false");
    expect(inputValue()).toBe("ber");
    key("Escape");
    expect(inputValue()).toBe("Amsterdam, Netherlands");
    expect(placeHeading()).toBe("Amsterdam");
  });

  it("restores the current place when focus leaves without a choice", async () => {
    stubApi();
    render(<App />);
    await screen.findAllByRole("article");

    type("ber");
    fireEvent.blur(combobox());
    expect(inputValue()).toBe("Amsterdam, Netherlands");
    expect(combobox().getAttribute("aria-expanded")).toBe("false");
  });

  it("opens the full city list with ArrowDown, like a dropdown", async () => {
    stubApi();
    render(<App />);
    await screen.findAllByRole("article");

    key("ArrowDown");
    expect(screen.getAllByRole("option")).toHaveLength(56);
  });

  it("says when nothing matches", async () => {
    stubApi({ search: () => Promise.resolve(Response.json([])) });
    render(<App />);
    await screen.findAllByRole("article");
    type("qwxz");
    expect(await screen.findByText("No places match “qwxz”.", { selector: "p" })).toBeTruthy();
  });

  it("keeps built-in matches when search is down", async () => {
    stubApi({ search: () => Promise.resolve(Response.json({ error: { code: "x", message: "y" } }, { status: 502 })) });
    render(<App />);
    await screen.findAllByRole("article");
    type("lis");
    expect(await screen.findByText(/only built-in cities are shown/, { selector: "p" })).toBeTruthy();
    expect(optionNames()).toEqual(["LisbonPortugal"]);
  });

  it("only searches the query typing paused on", async () => {
    vi.useFakeTimers();
    try {
      const api = stubApi();
      render(<App />);
      for (const text of ["tok", "toky", "tokyo"]) {
        type(text);
        await act(() => vi.advanceTimersByTimeAsync(100));
      }
      await act(() => vi.advanceTimersByTimeAsync(300));
      expect(api.searches().map((u) => u.searchParams.get("q"))).toEqual(["tokyo"]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("URL state", () => {
  it("opens a built-in city from ?city=", async () => {
    stubApi();
    window.history.replaceState(null, "", "/projects/weatherappv2/?city=gibraltar");
    render(<App />);
    expect(placeHeading()).toBe("Gibraltar");
    await screen.findAllByRole("article");
  });

  it("opens a searched place from its coordinates and name", async () => {
    const api = stubApi();
    window.history.replaceState(null, "", "/projects/weatherappv2/?lat=35.69&lon=139.69&name=Tokyo&country=Japan");
    render(<App />);
    expect(placeHeading()).toBe("Tokyo");
    await screen.findAllByRole("article");
    expect(api.forecasts()[0]?.searchParams.get("lat")).toBe("35.69");
  });

  it("falls back to Amsterdam for anything unreadable", async () => {
    stubApi();
    window.history.replaceState(null, "", "/projects/weatherappv2/?lat=999&lon=0&name=Nowhere&country=X");
    render(<App />);
    expect(placeHeading()).toBe("Amsterdam");
    await screen.findAllByRole("article");
  });
});

describe("accessibility", () => {
  it.each(["light", "dark"] as const)("has no axe violations in %s mode, with the list open", async (mode) => {
    stubApi();
    document.documentElement.classList.toggle("dark", mode === "dark");
    const { container } = render(<App />);
    await screen.findAllByRole("article");
    type("ber");
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
