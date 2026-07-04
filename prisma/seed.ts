import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists, skipping.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await db.user.create({
    data: { name: "Admin", email, passwordHash, role: "ADMIN", approved: true, active: true },
  });

  console.log(`Created admin account: ${email} / ${password}`);
  console.log("Change this password after first login (change-password flow is a future enhancement).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
