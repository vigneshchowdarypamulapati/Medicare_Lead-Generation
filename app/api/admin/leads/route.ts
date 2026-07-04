import { NextResponse } from "next/server";
import { $Enums, type LeadStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";

const LEAD_STATUSES = Object.values($Enums.LeadStatus);

export async function GET(request: Request) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status");
  // Ignore unknown status values instead of passing them to Prisma (which would throw).
  const status: LeadStatus | null =
    rawStatus && (LEAD_STATUSES as string[]).includes(rawStatus) ? (rawStatus as LeadStatus) : null;
  const agentId = url.searchParams.get("agentId");

  const leads = await db.lead.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(agentId ? { assignedToId: agentId } : {}),
    },
    include: { assignedTo: { omit: { passwordHash: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ leads }, { status: 200 });
}
