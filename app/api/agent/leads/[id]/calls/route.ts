import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import type { CallOutcome } from "@prisma/client";

const VALID_OUTCOMES: CallOutcome[] = ["ANSWERED", "MISSED", "VOICEMAIL"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = requireRole(await getSessionUser(request), "AGENT");
  if (!agent) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { outcome, notes } = (await request.json()) as { outcome?: CallOutcome; notes?: string };
  if (!outcome || !VALID_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({ where: { id, assignedToId: agent.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const call = await db.callLog.create({
    data: { leadId: lead.id, agentId: agent.id, outcome, notes: notes ?? null },
  });

  return NextResponse.json({ id: call.id }, { status: 201 });
}
