import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { beforeEach } from "vitest";

const testDbPath = path.join(__dirname, "..", "..", "prisma", "test.db");
process.env.DATABASE_URL = `file:${testDbPath}`;

beforeEach(() => {
  if (fs.existsSync(testDbPath)) fs.rmSync(testDbPath);
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
    stdio: "pipe",
  });
});
