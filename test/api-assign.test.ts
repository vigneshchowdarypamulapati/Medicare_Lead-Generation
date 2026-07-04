import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session";
import { GET } from "@/app/api/admin/leads/route";
import { POST } from "@/app/api/admin/leads/[id]/assign/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

async function makeAdmin() {
  return db.user.create({
    data: { name: "Admin", email: `admin-${Date.now()}-${Math.random()}@x.com`, passwordHash: "x", role: "ADMIN", approved: true },
  });
}

async function makeAgent(approved = true) {
  return db.user.create({
    data: { name: "Agent", email: `agent-${Date.now()}-${Math.random()}@x.com`, passwordHash: "x", role: "AGENT", approved },
  });
}

async function makeLead() {
  return db.lead.create({ data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", email: "jane@example.com" } });
}

describe("admin leads API", () => {
  it("lists all leads for an admin", async () => {
    const admin = await makeAdmin();
    await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;
    const res = await GET(new Request("http://localhost/api/admin/leads", { headers: { cookie } }));
    const data = (await res.json()) as { leads: unknown[] };
    expect(res.status).toBe(200);
    expect(data.leads.length).toBeGreaterThanOrEqual(1);
  });

  it("assigns a lead to an approved agent, records the audit trail, and notifies both parties", async () => {
    const admin = await makeAdmin();
    const agent = await makeAgent(true);
    const lead = await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    const req = new Request(`http://localhost/api/admin/leads/${lead.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ agentId: agent.id }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(200);

    const updated = await db.lead.findUnique({ where: { id: lead.id } });
    expect(updated?.assignedToId).toBe(agent.id);

    const assignment = await db.assignment.findFirst({ where: { leadId: lead.id } });
    expect(assignment?.toAgentId).toBe(agent.id);
    expect(assignment?.assignedById).toBe(admin.id);

    const notifLogs = await db.notificationLog.findMany({ where: { leadId: lead.id } });
    const recipientTypes = notifLogs.map((n) => n.recipientType).sort();
    expect(recipientTypes).toEqual(["AGENT", "LEAD"]);
  });

  it("rejects assignment to an unapproved agent", async () => {
    const admin = await makeAdmin();
    const agent = await makeAgent(false);
    const lead = await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    const req = new Request(`http://localhost/api/admin/leads/${lead.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ agentId: agent.id }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(400);
  });

  it("records fromAgentId on reassignment", async () => {
    const admin = await makeAdmin();
    const agentA = await makeAgent(true);
    const agentB = await makeAgent(true);
    const lead = await makeLead();
    const cookie = `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;

    await POST(
      new Request(`http://localhost/api/admin/leads/${lead.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ agentId: agentA.id }),
      }),
      { params: Promise.resolve({ id: lead.id }) }
    );

    const res = await POST(
      new Request(`http://localhost/api/admin/leads/${lead.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ agentId: agentB.id }),
      }),
      { params: Promise.resolve({ id: lead.id }) }
    );
    expect(res.status).toBe(200);

    const reassignment = await db.assignment.findFirst({
      where: { leadId: lead.id, toAgentId: agentB.id },
    });
    expect(reassignment?.fromAgentId).toBe(agentA.id);
  });
});
