import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import type { LeadStatus } from "@prisma/client";

export async function GET(request: Request) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as LeadStatus | null;
  const agentId = url.searchParams.get("agentId");

  const leads = await db.lead.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(agentId ? { assignedToId: agentId } : {}),
    },
    include: { assignedTo: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ leads }, { status: 200 });
}
