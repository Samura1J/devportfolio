import type { Plugin } from "vite";
import { themeInitScript } from "./theme-init.ts";

/** Inlines the pre-paint theme script at the top of <head>. */
export function themeInitPlugin(): Plugin {
  return {
    name: "portfolio:theme-init",
    transformIndexHtml() {
      return [{ tag: "script", children: themeInitScript, injectTo: "head-prepend" }];
    },
  };
}
