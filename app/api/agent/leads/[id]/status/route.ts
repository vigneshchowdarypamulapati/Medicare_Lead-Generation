import { NextResponse } from "next/server";
import { $Enums, type LeadStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import { readJsonObject } from "@/lib/http";

const VALID_STATUSES = Object.values($Enums.LeadStatus);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = requireRole(await getSessionUser(request), "AGENT");
  if (!agent) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const status = body.status as LeadStatus | undefined;
  if (typeof status !== "string" || !(VALID_STATUSES as string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({ where: { id, assignedToId: agent.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.$transaction(async (tx) => {
    await tx.statusHistory.create({
      data: { leadId: lead.id, fromStatus: lead.status, toStatus: status, changedById: agent.id },
    });
    return tx.lead.update({ where: { id: lead.id }, data: { status } });
  });

  return NextResponse.json({ id: updated.id, status: updated.status }, { status: 200 });
}
