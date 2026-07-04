import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session";
import { GET, POST } from "@/app/api/admin/agents/route";
import { PATCH } from "@/app/api/admin/agents/[id]/approve/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

async function makeAdminCookie() {
  const admin = await db.user.create({
    data: { name: "Admin", email: `admin-${Date.now()}@x.com`, passwordHash: "x", role: "ADMIN", approved: true },
  });
  return `session=${signSession({ userId: admin.id, role: "ADMIN" })}`;
}

async function makeAgentCookie() {
  const agent = await db.user.create({
    data: { name: "Agent", email: `agent-${Date.now()}@x.com`, passwordHash: "x", role: "AGENT", approved: true },
  });
  return `session=${signSession({ userId: agent.id, role: "AGENT" })}`;
}

describe("admin agents API", () => {
  it("lets an admin create a new agent", async () => {
    const cookie = await makeAdminCookie();
    const req = new Request("http://localhost/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "New Agent", email: "newagent@x.com", password: "pw123456", phone: "555-000-1111" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const agent = await db.user.findUnique({ where: { email: "newagent@x.com" } });
    expect(agent?.role).toBe("AGENT");
    expect(agent?.approved).toBe(false);
  });

  it("rejects agent creation from a non-admin", async () => {
    const cookie = await makeAgentCookie();
    const req = new Request("http://localhost/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "New Agent", email: "blocked@x.com", password: "pw123456", phone: "555" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("lists all agents for an admin", async () => {
    const cookie = await makeAdminCookie();
    await db.user.create({
      data: { name: "Agent A", email: "a@x.com", passwordHash: "x", role: "AGENT", approved: false },
    });

    const req = new Request("http://localhost/api/admin/agents", { headers: { cookie } });
    const res = await GET(req);
    const data = (await res.json()) as { agents: unknown[] };
    expect(res.status).toBe(200);
    expect(data.agents.length).toBeGreaterThanOrEqual(1);
  });

  it("lets an admin approve an agent", async () => {
    const cookie = await makeAdminCookie();
    const agent = await db.user.create({
      data: { name: "Agent B", email: "b@x.com", passwordHash: "x", role: "AGENT", approved: false },
    });

    const req = new Request(`http://localhost/api/admin/agents/${agent.id}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ approved: true }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: agent.id }) });
    expect(res.status).toBe(200);

    const updated = await db.user.findUnique({ where: { id: agent.id } });
    expect(updated?.approved).toBe(true);
  });

  it("never exposes passwordHash in the agents list response", async () => {
    const cookie = await makeAdminCookie();
    await db.user.create({
      data: { name: "Agent H", email: "hash@x.com", passwordHash: "super-secret-hash", role: "AGENT", approved: true },
    });

    const res = await GET(new Request("http://localhost/api/admin/agents", { headers: { cookie } }));
    expect(res.status).toBe(200);
    const raw = JSON.stringify(await res.json());
    expect(raw).not.toContain("passwordHash");
    expect(raw).not.toContain("super-secret-hash");
  });

  it("returns 409 for a duplicate agent email", async () => {
    const cookie = await makeAdminCookie();
    await db.user.create({
      data: { name: "Existing", email: "dupe@x.com", passwordHash: "x", role: "AGENT", approved: true },
    });

    const req = new Request("http://localhost/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "Dupe", email: "dupe@x.com", password: "pw123456" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("returns 404 when approving an unknown agent id", async () => {
    const cookie = await makeAdminCookie();
    const req = new Request("http://localhost/api/admin/agents/nonexistent/approve", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ approved: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when approved is missing or not a boolean", async () => {
    const cookie = await makeAdminCookie();
    const agent = await db.user.create({
      data: { name: "Agent C", email: "c@x.com", passwordHash: "x", role: "AGENT", approved: true },
    });

    const req = new Request(`http://localhost/api/admin/agents/${agent.id}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: agent.id }) });
    expect(res.status).toBe(400);

    // The empty PATCH must not silently de-approve the agent.
    const unchanged = await db.user.findUnique({ where: { id: agent.id } });
    expect(unchanged?.approved).toBe(true);
  });

  it("returns 404 when the approve target is not an agent", async () => {
    const cookie = await makeAdminCookie();
    const otherAdmin = await db.user.create({
      data: { name: "Other Admin", email: `admin2-${Date.now()}@x.com`, passwordHash: "x", role: "ADMIN", approved: true },
    });

    const req = new Request(`http://localhost/api/admin/agents/${otherAdmin.id}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ approved: false }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: otherAdmin.id }) });
    expect(res.status).toBe(404);
  });
});
