import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyInitialTheme, THEME_STORAGE_KEY, themeInitScript } from "./theme-init";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });
  afterEach(cleanup);

  it("switches to dark, sets the class and stores the choice", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeTruthy();
  });

  it("starts from whatever the init script applied", () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeTruthy();
  });
});

describe("applyInitialTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("applies a stored dark preference", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    applyInitialTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not throw when matchMedia is missing", () => {
    expect(() => {
      applyInitialTheme();
    }).not.toThrow();
  });

  it("uses the shared storage key and is injected as a self-invoking script", () => {
    expect(themeInitScript).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(themeInitScript.startsWith("(function applyInitialTheme")).toBe(true);
    expect(themeInitScript.endsWith(")();")).toBe(true);
  });
});
