import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// jsdom has no layout, so it doesn't implement scrollIntoView.
Element.prototype.scrollIntoView = function scrollIntoView() {
  // nothing to scroll
};

beforeEach(() => {
  window.history.replaceState(null, "", "/projects/weatherappv2/");
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
