import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  target: "node22",
  clean: true,
  sourcemap: true,
  // @portfolio/shared ships raw .ts, which Node can't load from node_modules,
  // so it must be bundled in rather than left as an external import.
  noExternal: ["@portfolio/shared"],
});
