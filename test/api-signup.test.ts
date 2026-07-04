import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { POST as signup } from "@/app/api/auth/signup/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validLead = {
  role: "LEAD",
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "555-123-4567",
  password: "supersecret",
  honeypot: "",
};

const validAgent = { ...validLead, role: "AGENT", email: "agent@example.com" };

describe("POST /api/auth/signup", () => {
  it("creates an active lead account and logs them in", async () => {
    const res = await signup(makeRequest(validLead));
    expect(res.status).toBe(201);
    expect(res.headers.get("set-cookie")).toContain("session=");

    const user = await db.user.findUnique({ where: { email: "jane@example.com" } });
    expect(user?.role).toBe("LEAD");
    expect(user?.approved).toBe(true);
    expect(user?.active).toBe(true);
  });

  it("creates a pending agent account without a session", async () => {
    const res = await signup(makeRequest(validAgent));
    expect(res.status).toBe(201);
    expect(res.headers.get("set-cookie")).toBeNull();
    const bodyJson = (await res.json()) as { status?: string };
    expect(bodyJson.status).toBe("pending_approval");

    const user = await db.user.findUnique({ where: { email: "agent@example.com" } });
    expect(user?.role).toBe("AGENT");
    expect(user?.approved).toBe(false);
  });

  it("never lets a caller register as ADMIN", async () => {
    const res = await signup(makeRequest({ ...validLead, role: "ADMIN", email: "sneaky@example.com" }));
    expect(res.status).toBe(400);
    const user = await db.user.findUnique({ where: { email: "sneaky@example.com" } });
    expect(user).toBeNull();
  });

  it("rejects a duplicate email with 409", async () => {
    await signup(makeRequest(validLead));
    const res = await signup(makeRequest({ ...validLead, name: "Someone Else" }));
    expect(res.status).toBe(409);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await signup(makeRequest({ ...validLead, password: "short", email: "short@example.com" }));
    expect(res.status).toBe(400);
    const user = await db.user.findUnique({ where: { email: "short@example.com" } });
    expect(user).toBeNull();
  });

  it("rejects a missing name", async () => {
    const res = await signup(makeRequest({ ...validLead, name: "", email: "noname@example.com" }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email", async () => {
    const res = await signup(makeRequest({ ...validLead, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("rejects a filled honeypot", async () => {
    const res = await signup(makeRequest({ ...validLead, honeypot: "i-am-a-bot", email: "bot@example.com" }));
    expect(res.status).toBe(400);
    const user = await db.user.findUnique({ where: { email: "bot@example.com" } });
    expect(user).toBeNull();
  });

  it("rejects a non-JSON body with 400", async () => {
    const res = await signup(makeRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("creates the account with a hashed password, never plaintext", async () => {
    await signup(makeRequest(validLead));
    const user = await db.user.findUnique({ where: { email: "jane@example.com" } });
    expect(user?.passwordHash).not.toBe("supersecret");
    expect(user?.passwordHash).toBeTruthy();
  });
});
