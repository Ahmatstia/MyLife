import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 120000,
    globalSetup: "./tests/global-setup.ts",
    setupFiles: ["./tests/support/test-db-setup.ts"],
    env: {
      AUTH_SECRET: "test-secret-for-vitest-only",
      AUTH_ACCESS_CODE: "test-access-code",
    },
  },
});