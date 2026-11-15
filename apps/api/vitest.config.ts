import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "api",
    environment: "node",
    restoreMocks: true,
    // node:sqlite (seat holds) is marked experimental in Node 22 and warns on every load.
    execArgv: ["--disable-warning=ExperimentalWarning"],
  },
});
