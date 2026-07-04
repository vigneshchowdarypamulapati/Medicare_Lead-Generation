import { NextResponse } from "next/server";
import { $Enums, type CallOutcome } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/session";
import { readJsonObject } from "@/lib/http";

const VALID_OUTCOMES = Object.values($Enums.CallOutcome);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = requireRole(await getSessionUser(request), "AGENT");
  if (!agent) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const outcome = body.outcome as CallOutcome | undefined;
  const notes = typeof body.notes === "string" ? body.notes : undefined;
  if (typeof outcome !== "string" || !(VALID_OUTCOMES as string[]).includes(outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({ where: { id, assignedToId: agent.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const call = await db.callLog.create({
    data: { leadId: lead.id, agentId: agent.id, outcome, notes: notes ?? null },
  });

  return NextResponse.json({ id: call.id }, { status: 201 });
}
