import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session";
import { PATCH } from "@/app/api/agent/leads/[id]/status/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

async function makeAgent() {
  return db.user.create({
    data: { name: "Agent", email: `agent-${Math.random()}@x.com`, passwordHash: "x", role: "AGENT", approved: true },
  });
}

describe("PATCH /api/agent/leads/:id/status", () => {
  it("updates the lead status and records status history", async () => {
    const agent = await makeAgent();
    const lead = await db.lead.create({
      data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", assignedToId: agent.id },
    });
    const cookie = `session=${signSession({ userId: agent.id, role: "AGENT" })}`;

    const req = new Request(`http://localhost/api/agent/leads/${lead.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(200);

    const updated = await db.lead.findUnique({ where: { id: lead.id } });
    expect(updated?.status).toBe("CONTACTED");

    const history = await db.statusHistory.findFirst({ where: { leadId: lead.id } });
    expect(history?.fromStatus).toBe("NEW");
    expect(history?.toStatus).toBe("CONTACTED");
    expect(history?.changedById).toBe(agent.id);
  });

  it("rejects updates from an agent who does not own the lead", async () => {
    const owner = await makeAgent();
    const outsider = await makeAgent();
    const lead = await db.lead.create({
      data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", assignedToId: owner.id },
    });
    const cookie = `session=${signSession({ userId: outsider.id, role: "AGENT" })}`;

    const req = new Request(`http://localhost/api/agent/leads/${lead.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(404);
  });
});
