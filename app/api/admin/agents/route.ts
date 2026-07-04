import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const agents = await db.user.findMany({
    where: { role: "AGENT" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ agents }, { status: 200 });
}

export async function POST(request: Request) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password, phone } = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const agent = await db.user.create({
    data: { name, email, passwordHash, phone, role: "AGENT", approved: false, active: true },
  });

  return NextResponse.json({ id: agent.id }, { status: 201 });
}
