// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards the review's contrast fixes (D2/D3): every text token must reach
 * WCAG AA (4.5:1) on every surface, in both themes. Parses theme.css so a
 * token edit that breaks contrast fails here.
 */
const css = readFileSync(new URL("./theme.css", import.meta.url), "utf8");

function tokens(selector: ":root" | ".dark"): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...block.matchAll(/--cj-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1] ?? "", m[2] ?? ""]),
  );
}

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const surfaces = ["surface", "surface-container", "surface-container-high"];
const textTokens = ["on-surface", "on-surface-muted", "primary", "accent-ink", "success-ink"];

describe.each([":root", ".dark"] as const)("theme %s", (selector) => {
  const t = tokens(selector);

  it("defines every token checked here", () => {
    for (const name of [...surfaces, ...textTokens, "on-primary", "outline-strong"]) {
      expect(t[name], name).toMatch(/^#/);
    }
  });

  it.each(textTokens)("%s text reaches 4.5:1 on every surface", (fg) => {
    for (const bg of surfaces) {
      expect(contrast(t[fg] ?? "", t[bg] ?? ""), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("on-primary text reaches 4.5:1 on primary", () => {
    expect(contrast(t["on-primary"] ?? "", t.primary ?? "")).toBeGreaterThanOrEqual(4.5);
  });

  it("form-control borders reach 3:1 on every surface", () => {
    for (const bg of surfaces) {
      expect(contrast(t["outline-strong"] ?? "", t[bg] ?? "")).toBeGreaterThanOrEqual(3);
    }
  });
});
