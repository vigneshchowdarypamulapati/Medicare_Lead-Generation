import { db } from "@/lib/db";
import type { Lead, User } from "@prisma/client";

function notifyAgentAssigned(agent: User, lead: Lead) {
  console.log(`[notify:agent] ${agent.email} — new lead assigned: ${lead.fullName} (${lead.phone})`);
}

function notifyLeadOfAssignment(lead: Lead, agent: User) {
  console.log(
    `[notify:lead] ${lead.email} — your Medicare advocate ${agent.name} (${agent.phone ?? "no phone on file"}) will be reaching out shortly.`
  );
}

export async function notifyAssignment({ lead, agent }: { lead: Lead; agent: User }) {
  notifyAgentAssigned(agent, lead);

  const hasEmail = Boolean(lead.email && lead.email.trim() !== "");
  if (hasEmail) {
    notifyLeadOfAssignment(lead, agent);
  }

  // Write both log entries atomically so the pair can never be half-written.
  await db.$transaction([
    db.notificationLog.create({
      data: { leadId: lead.id, recipientType: "AGENT", channel: "IN_APP", status: "SENT" },
    }),
    db.notificationLog.create({
      data: { leadId: lead.id, recipientType: "LEAD", channel: "EMAIL", status: hasEmail ? "SENT" : "SKIPPED" },
    }),
  ]);
}
