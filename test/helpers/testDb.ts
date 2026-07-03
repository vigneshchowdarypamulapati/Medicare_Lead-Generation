import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { beforeEach } from "vitest";
import { db } from "../../lib/db";

const testDbPath = path.join(__dirname, "..", "..", "prisma", "test.db");
process.env.DATABASE_URL = `file:${testDbPath}`;

beforeEach(async () => {
  // Disconnect first: on Windows, deleting the SQLite file while the
  // PrismaClient singleton still holds it open fails with EPERM.
  // Prisma reconnects lazily on the next query.
  await db.$disconnect();
  if (fs.existsSync(testDbPath)) fs.rmSync(testDbPath);
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
    stdio: "pipe",
  });
});
