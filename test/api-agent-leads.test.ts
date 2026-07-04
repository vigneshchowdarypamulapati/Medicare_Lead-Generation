import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session";
import { GET as listMine } from "@/app/api/agent/leads/route";
import { GET as getOne } from "@/app/api/agent/leads/[id]/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

async function makeAgent() {
  return db.user.create({
    data: { name: "Agent", email: `agent-${Math.random()}@x.com`, passwordHash: "x", role: "AGENT", approved: true },
  });
}

async function makeLead(assignedToId?: string) {
  return db.lead.create({ data: { fullName: "Jane Doe", phone: "555-123-4567", zip: "94103", assignedToId } });
}

describe("agent leads API", () => {
  it("returns only leads assigned to the requesting agent", async () => {
    const agentA = await makeAgent();
    const agentB = await makeAgent();
    await makeLead(agentA.id);
    await makeLead(agentB.id);

    const cookie = `session=${signSession({ userId: agentA.id, role: "AGENT" })}`;
    const res = await listMine(new Request("http://localhost/api/agent/leads", { headers: { cookie } }));
    const data = (await res.json()) as { leads: { assignedToId: string }[] };

    expect(res.status).toBe(200);
    expect(data.leads).toHaveLength(1);
    expect(data.leads[0].assignedToId).toBe(agentA.id);
  });

  it("returns 404 when an agent requests a lead assigned to someone else", async () => {
    const agentA = await makeAgent();
    const agentB = await makeAgent();
    const leadForB = await makeLead(agentB.id);

    const cookie = `session=${signSession({ userId: agentA.id, role: "AGENT" })}`;
    const res = await getOne(
      new Request(`http://localhost/api/agent/leads/${leadForB.id}`, { headers: { cookie } }),
      { params: Promise.resolve({ id: leadForB.id }) }
    );

    expect(res.status).toBe(404);
  });

  it("rejects an agent who was de-approved after their session was issued", async () => {
    const agent = await makeAgent();
    await makeLead(agent.id);
    const cookie = `session=${signSession({ userId: agent.id, role: "AGENT" })}`;

    // De-approve the agent after the (still cryptographically valid) session was signed.
    await db.user.update({ where: { id: agent.id }, data: { approved: false } });

    const res = await listMine(new Request("http://localhost/api/agent/leads", { headers: { cookie } }));
    expect(res.status).toBe(403);
  });

  it("returns the lead when it is assigned to the requesting agent", async () => {
    const agentA = await makeAgent();
    const lead = await makeLead(agentA.id);

    const cookie = `session=${signSession({ userId: agentA.id, role: "AGENT" })}`;
    const res = await getOne(
      new Request(`http://localhost/api/agent/leads/${lead.id}`, { headers: { cookie } }),
      { params: Promise.resolve({ id: lead.id }) }
    );

    expect(res.status).toBe(200);
  });
});
