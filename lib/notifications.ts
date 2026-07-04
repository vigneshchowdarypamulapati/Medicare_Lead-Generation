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
  await db.notificationLog.create({
    data: { leadId: lead.id, recipientType: "AGENT", channel: "IN_APP", status: "SENT" },
  });

  if (lead.email && lead.email.trim() !== "") {
    notifyLeadOfAssignment(lead, agent);
    await db.notificationLog.create({
      data: { leadId: lead.id, recipientType: "LEAD", channel: "EMAIL", status: "SENT" },
    });
  } else {
    await db.notificationLog.create({
      data: { leadId: lead.id, recipientType: "LEAD", channel: "EMAIL", status: "SKIPPED" },
    });
  }
}
