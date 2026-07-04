import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globalSetup: ["test/helpers/globalSetup.ts"],
    setupFiles: ["test/helpers/testDb.ts"],
    // Required: every test file shares the same remote Neon test database,
    // and tests truncate all tables between runs.
    fileParallelism: false,
    // Remote Postgres adds network latency to every query; keep generous
    // timeouts so slow links don't produce spurious failures.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
