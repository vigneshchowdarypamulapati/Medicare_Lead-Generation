import path from "path";
import { beforeEach } from "vitest";
import { loadEnvConfig } from "@next/env";
import { db } from "../../lib/db";

// Point every PrismaClient in the test process at the dedicated Neon test
// branch. This runs before any test imports lib/db, and the client reads
// DATABASE_URL lazily on first query. globalSetup.ts has already verified
// TEST_DATABASE_URL exists, differs from the app database, and pushed the
// schema onto it.
loadEnvConfig(path.join(__dirname, "..", ".."));
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;

// Wipe all rows between tests (much faster than re-pushing the schema over
// the network). Table names are Prisma's quoted model names.
beforeEach(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "User","Lead","StatusHistory","Assignment","Payment","CallLog","NotificationLog" RESTART IDENTITY CASCADE'
  );
});
