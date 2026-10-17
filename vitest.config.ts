import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.{ts,tsx}"],
    environment: "node",
    // Embedded Postgres tests start slowly when the whole suite runs in parallel.
    testTimeout: 20_000,
  },
});
