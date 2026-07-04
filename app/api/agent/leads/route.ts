import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";

export async function GET(request: Request) {
  const agent = requireRole(await getSessionUser(request), "AGENT");
  if (!agent) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const leads = await db.lead.findMany({
    where: { assignedToId: agent.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ leads }, { status: 200 });
}
