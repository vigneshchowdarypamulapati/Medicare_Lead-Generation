import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import { notifyAssignment } from "@/lib/notifications";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireRole(await getSessionUser(request), "ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId } = await params;
  const { agentId } = (await request.json()) as { agentId?: string };
  if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 });

  const [lead, agent] = await Promise.all([
    db.lead.findUnique({ where: { id: leadId } }),
    db.user.findUnique({ where: { id: agentId } }),
  ]);

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!agent || agent.role !== "AGENT" || !agent.approved || !agent.active) {
    return NextResponse.json({ error: "Agent is not an approved, active agent" }, { status: 400 });
  }

  const previousAgentId = lead.assignedToId;

  const updatedLead = await db.$transaction(async (tx) => {
    await tx.assignment.create({
      data: {
        leadId: lead.id,
        fromAgentId: previousAgentId,
        toAgentId: agent.id,
        assignedById: admin.id,
      },
    });
    return tx.lead.update({ where: { id: lead.id }, data: { assignedToId: agent.id } });
  });

  await notifyAssignment({ lead: updatedLead, agent });

  return NextResponse.json({ id: updatedLead.id, assignedToId: updatedLead.assignedToId }, { status: 200 });
}
