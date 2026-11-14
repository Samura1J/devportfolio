import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

/*
 * jsdom has no <dialog> support. This mirrors the browser contract the app
 * relies on: showModal/close toggle `open`, and close() fires a "close" event.
 * Focus trapping and Esc are browser-native and get checked in a real browser.
 */
if (typeof HTMLDialogElement.prototype.showModal !== "function") {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      this.open = true;
    },
    close(this: HTMLDialogElement) {
      if (!this.open) return;
      this.open = false;
      this.dispatchEvent(new Event("close"));
    },
  });
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
