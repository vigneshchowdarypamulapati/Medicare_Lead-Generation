import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { notifyAssignment } from "@/lib/notifications";

async function makeAgent(email: string) {
  return db.user.create({
    data: { name: "Agent Smith", email, passwordHash: "x", role: "AGENT", approved: true },
  });
}

async function makeLead(overrides: Partial<{ email: string | null }> = {}) {
  const email = "email" in overrides ? overrides.email : "jane@example.com";
  return db.lead.create({
    data: {
      fullName: "Jane Doe",
      phone: "555-123-4567",
      zip: "94103",
      email,
    },
  });
}

describe("notifyAssignment", () => {
  it("logs an IN_APP SENT notification for the agent", async () => {
    const agent = await makeAgent("agent1@example.com");
    const lead = await makeLead();

    await notifyAssignment({ lead, agent });

    const agentLog = await db.notificationLog.findFirst({
      where: { leadId: lead.id, recipientType: "AGENT" },
    });
    expect(agentLog?.channel).toBe("IN_APP");
    expect(agentLog?.status).toBe("SENT");
  });

  it("logs an EMAIL SENT notification for the lead when the lead has an email", async () => {
    const agent = await makeAgent("agent2@example.com");
    const lead = await makeLead({ email: "jane@example.com" });

    await notifyAssignment({ lead, agent });

    const leadLog = await db.notificationLog.findFirst({
      where: { leadId: lead.id, recipientType: "LEAD" },
    });
    expect(leadLog?.channel).toBe("EMAIL");
    expect(leadLog?.status).toBe("SENT");
  });

  it("logs an EMAIL SKIPPED notification for the lead when the lead has no email", async () => {
    const agent = await makeAgent("agent3@example.com");
    const lead = await makeLead({ email: null });

    await notifyAssignment({ lead, agent });

    const leadLog = await db.notificationLog.findFirst({
      where: { leadId: lead.id, recipientType: "LEAD" },
    });
    expect(leadLog?.channel).toBe("EMAIL");
    expect(leadLog?.status).toBe("SKIPPED");
  });
});
