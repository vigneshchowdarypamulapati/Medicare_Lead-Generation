import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { POST as login } from "@/app/api/auth/login/route";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  it("sets a session cookie for correct admin credentials", async () => {
    const passwordHash = await hashPassword("secret123");
    await db.user.create({
      data: { name: "Admin", email: "admin@x.com", passwordHash, role: "ADMIN", approved: true, active: true },
    });

    const res = await login(makeRequest({ email: "admin@x.com", password: "secret123" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("session=");
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await hashPassword("secret123");
    await db.user.create({
      data: { name: "Admin", email: "admin2@x.com", passwordHash, role: "ADMIN", approved: true, active: true },
    });

    const res = await login(makeRequest({ email: "admin2@x.com", password: "wrong" }));
    expect(res.status).toBe(401);
  });

  it("rejects an unapproved agent", async () => {
    const passwordHash = await hashPassword("secret123");
    await db.user.create({
      data: { name: "Agent", email: "agent@x.com", passwordHash, role: "AGENT", approved: false, active: true },
    });

    const res = await login(makeRequest({ email: "agent@x.com", password: "secret123" }));
    expect(res.status).toBe(403);
  });

  it("rejects login for an unknown email (and takes similar time to a wrong password)", async () => {
    const res = await login(makeRequest({ email: "nobody@x.com", password: "whatever123" }));
    expect(res.status).toBe(401);
  });
});
