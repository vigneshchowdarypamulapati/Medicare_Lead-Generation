import { execSync } from "child_process";
import path from "path";
import { loadEnvConfig } from "@next/env";

// Runs once before the whole suite: points Prisma at the dedicated Neon test
// branch and force-resets its schema so tests start from a clean database.
export default function globalSetup() {
  loadEnvConfig(path.join(__dirname, "..", ".."));

  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is not set — refusing to run tests.");
  }
  if (testUrl === process.env.DATABASE_URL || testUrl === process.env.DIRECT_URL) {
    throw new Error(
      "TEST_DATABASE_URL matches the app database — refusing to run tests against production data."
    );
  }

  // Non-destructive: creates the schema on the (empty) test branch and is a
  // no-op when it already matches. Data cleanup between tests is handled by
  // TRUNCATE in testDb.ts, so no --force-reset is needed.
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl },
    stdio: "pipe",
  });
}
