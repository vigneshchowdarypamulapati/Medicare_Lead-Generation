import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import { readJsonObject } from "@/lib/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { approved } = body;
  if (typeof approved !== "boolean") {
    return NextResponse.json({ error: "approved must be a boolean" }, { status: 400 });
  }

  // Scoped to AGENT rows so admin accounts can't be (de)approved through this endpoint,
  // and so an unknown or non-agent id yields a 404 rather than a Prisma P2025 crash.
  const result = await db.user.updateMany({
    where: { id, role: "AGENT" },
    data: { approved },
  });
  if (result.count === 0) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  return NextResponse.json({ id, approved }, { status: 200 });
}
