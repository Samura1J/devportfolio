export const THEME_STORAGE_KEY = "theme";

export type Theme = "light" | "dark";

/**
 * Runs before first paint so a dark-mode visitor never sees a light flash.
 * A stored choice wins, otherwise the OS preference.
 *
 * `themeInitPlugin` injects this function's source into <head>, so it must stay
 * self-contained: no imports or outer variables (hence the literal key, which a
 * test checks against THEME_STORAGE_KEY).
 */
export function applyInitialTheme(): void {
  try {
    const stored = localStorage.getItem("theme");
    const dark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch {
    // Storage or matchMedia unavailable: keep the light default.
  }
}

export const themeInitScript = `(${applyInitialTheme.toString()})();`;
