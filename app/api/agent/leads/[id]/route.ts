import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = requireRole(await getSessionUser(request), "AGENT");
  if (!agent) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, assignedToId: agent.id },
    include: { statusHistory: { orderBy: { createdAt: "desc" } }, callLogs: { orderBy: { createdAt: "desc" } } },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead }, { status: 200 });
}
