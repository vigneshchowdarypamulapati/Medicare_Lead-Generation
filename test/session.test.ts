import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession } from "@/lib/session";
import { requireRole } from "@/lib/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

describe("session", () => {
  it("round-trips a valid session token", () => {
    const token = signSession({ userId: "user_1", role: "ADMIN" });
    const payload = verifySession(token);
    expect(payload).toEqual({ userId: "user_1", role: "ADMIN" });
  });

  it("rejects a tampered token", () => {
    const token = signSession({ userId: "user_1", role: "ADMIN" });
    const tampered = token.replace(/.$/, token.endsWith("a") ? "b" : "a");
    expect(verifySession(tampered)).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifySession("not-a-real-token")).toBeNull();
  });
});

describe("requireRole", () => {
  it("returns the user when role matches", () => {
    const user = { id: "u1", role: "ADMIN" as const, active: true };
    expect(requireRole(user, "ADMIN")).toBe(user);
  });

  it("returns null when role does not match", () => {
    const user = { id: "u1", role: "AGENT" as const, active: true };
    expect(requireRole(user, "ADMIN")).toBeNull();
  });

  it("returns null when user is null", () => {
    expect(requireRole(null, "ADMIN")).toBeNull();
  });
});
