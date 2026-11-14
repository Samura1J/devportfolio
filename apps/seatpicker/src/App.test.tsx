import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("App", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("reports the API as up when /health answers ok", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json({ ok: true }))));
    render(<App />);
    expect(screen.getByRole("heading", { name: "Seat Picker" })).toBeTruthy();
    expect(await screen.findByText("up")).toBeTruthy();
  });

  it("reports the API as down on a bad response", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json({ ok: false }))));
    render(<App />);
    expect(await screen.findByText("down")).toBeTruthy();
  });
});
