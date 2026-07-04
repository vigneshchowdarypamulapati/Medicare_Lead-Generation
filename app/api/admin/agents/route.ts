import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { readJsonObject } from "@/lib/http";

export async function GET(request: Request) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const agents = await db.user.findMany({
    where: { role: "AGENT" },
    omit: { passwordHash: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ agents }, { status: 200 });
}

export async function POST(request: Request) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { name, email, password, phone } = body;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name ||
    !email ||
    !password
  ) {
    return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
  }
  if (phone !== undefined && phone !== null && typeof phone !== "string") {
    return NextResponse.json({ error: "phone must be a string" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  try {
    const agent = await db.user.create({
      data: { name, email, passwordHash, phone: phone ?? undefined, role: "AGENT", approved: false, active: true },
    });
    return NextResponse.json({ id: agent.id }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    throw err;
  }
}
