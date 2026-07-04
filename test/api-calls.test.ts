import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session";
import { POST } from "@/app/api/agent/leads/[id]/calls/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

async function makeAgent() {
  return db.user.create({
    data: { name: "Agent", email: `agent-${Math.random()}@x.com`, passwordHash: "x", role: "AGENT", approved: true },
  });
}

describe("POST /api/agent/leads/:id/calls", () => {
  it("logs a call outcome for a lead owned by the agent", async () => {
    const agent = await makeAgent();
    const lead = await db.lead.create({
      data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", assignedToId: agent.id },
    });
    const cookie = `session=${signSession({ userId: agent.id, role: "AGENT" })}`;

    const req = new Request(`http://localhost/api/agent/leads/${lead.id}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ outcome: "MISSED", notes: "No answer, left voicemail" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(201);

    const call = await db.callLog.findFirst({ where: { leadId: lead.id } });
    expect(call?.outcome).toBe("MISSED");
    expect(call?.agentId).toBe(agent.id);
  });

  it("rejects logging a call for a lead not owned by the agent", async () => {
    const owner = await makeAgent();
    const outsider = await makeAgent();
    const lead = await db.lead.create({
      data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", assignedToId: owner.id },
    });
    const cookie = `session=${signSession({ userId: outsider.id, role: "AGENT" })}`;

    const req = new Request(`http://localhost/api/agent/leads/${lead.id}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ outcome: "ANSWERED" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(404);
  });
});
