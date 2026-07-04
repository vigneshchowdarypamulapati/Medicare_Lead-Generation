import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession } from "@/lib/session";

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
