import { defineConfig } from "vitest/config";

// Each project keeps its own config (vite.config.ts for frontends,
// vitest.config.ts elsewhere); this file just runs them all together.
export default defineConfig({
  test: {
    projects: ["apps/*", "packages/shared", "packages/ui"],
  },
});
