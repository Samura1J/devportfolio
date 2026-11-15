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
  // Keep "node:" prefixes: node:sqlite exists only under that name, and
  // stripping it (tsup's default) produces an import of a missing "sqlite" package.
  removeNodeProtocol: false,
});
