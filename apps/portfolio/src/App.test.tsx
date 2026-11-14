import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { projects } from "./content/content";

function caseParam(): string | null {
  return new URLSearchParams(window.location.search).get("case");
}

function getDialog(): HTMLDialogElement {
  const dialog = document.querySelector("dialog");
  if (!dialog) throw new Error("dialog not rendered");
  return dialog;
}

describe("portfolio page", () => {
  it("renders the hero and one card per project", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(projects.length);
    for (const project of projects) {
      expect(screen.getByRole("article", { name: new RegExp(project.title) })).toBeTruthy();
    }
  });

  it.each(["light", "dark"] as const)("has no axe violations in %s mode", async (mode) => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    const { container } = render(<App />);
    const results = await axe.run(container, {
      // jsdom can't compute layout or colors; contrast is covered by
      // packages/ui theme.contrast.test.ts.
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

describe("case study dialog", () => {
  it("opens from a ?case= deep link and closes back to the page", () => {
    window.history.replaceState(null, "", "/?case=weather");
    render(<App />);

    const dialog = getDialog();
    expect(dialog.open).toBe(true);
    expect(within(dialog).getByRole("heading", { level: 2 }).textContent).toBe(projects[0]?.title);

    fireEvent.click(within(dialog).getByRole("button", { name: "Close case study" }));
    expect(dialog.open).toBe(false);
    expect(caseParam()).toBeNull();
  });

  it("ignores unknown slugs", () => {
    window.history.replaceState(null, "", "/?case=nope");
    render(<App />);
    expect(getDialog().open).toBe(false);
  });

  it("opens from a card, switches projects in place, and Back closes it", async () => {
    render(<App />);
    const seatpicker = projects[1];
    if (!seatpicker) throw new Error("expected two projects");

    fireEvent.click(screen.getByRole("link", { name: `View Case Study: ${seatpicker.title}` }));
    const dialog = getDialog();
    expect(dialog.open).toBe(true);
    expect(caseParam()).toBe("seatpicker");

    fireEvent.click(within(dialog).getByRole("button", { name: /^Previous:/ }));
    expect(caseParam()).toBe("weather");
    expect(within(dialog).getByRole("heading", { level: 2 }).textContent).toBe(projects[0]?.title);

    // Prev/next replace the history entry, so one Back closes the dialog.
    window.history.back();
    await waitFor(() => {
      expect(dialog.open).toBe(false);
    });
    expect(caseParam()).toBeNull();
  });

  it("clears the URL when the browser closes the dialog (Esc)", async () => {
    render(<App />);
    const [firstLink] = screen.getAllByRole("link", { name: /^View Case Study/ });
    if (!firstLink) throw new Error("no case study links");
    fireEvent.click(firstLink);
    const dialog = getDialog();

    dialog.close(); // what the browser does on Esc
    await waitFor(() => {
      expect(caseParam()).toBeNull();
    });
  });
});
