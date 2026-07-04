import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { POST } from "@/app/api/leads/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  fullName: "Jane Doe",
  phone: "555-123-4567",
  email: "jane@example.com",
  zip: "94103",
  ageBracket: "65-70",
  currentCoverage: "None",
  preferredContactTime: "Morning",
  notes: "",
  honeypot: "",
};

describe("POST /api/leads", () => {
  it("creates a lead and returns 201 for valid input", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);

    const leads = await db.lead.findMany();
    expect(leads).toHaveLength(1);
    expect(leads[0].fullName).toBe("Jane Doe");
    expect(leads[0].status).toBe("NEW");
  });

  it("returns 400 and creates no lead for invalid input", async () => {
    const res = await POST(makeRequest({ ...validBody, phone: "" }));
    expect(res.status).toBe(400);

    const leads = await db.lead.findMany();
    expect(leads).toHaveLength(0);
  });

  it("returns 400 and creates no lead when the honeypot is filled", async () => {
    const res = await POST(makeRequest({ ...validBody, honeypot: "bot" }));
    expect(res.status).toBe(400);

    const leads = await db.lead.findMany();
    expect(leads).toHaveLength(0);
  });
});
