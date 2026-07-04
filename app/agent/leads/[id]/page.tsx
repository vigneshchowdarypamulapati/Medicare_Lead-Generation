import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import ClickToCallButton from "@/components/ClickToCallButton";
import LeadActions from "./LeadActions";

export default async function AgentLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();

  const lead = await db.lead.findFirst({
    where: { id, assignedToId: user!.id },
    include: {
      statusHistory: { orderBy: { createdAt: "desc" } },
      callLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{lead.fullName}</h1>
        <p className="text-slate-600">{lead.phone} · {lead.email ?? "no email"} · ZIP {lead.zip}</p>
        {lead.notes && <p className="text-slate-600 mt-2">Notes: {lead.notes}</p>}
        <div className="mt-3">
          <ClickToCallButton
            className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white font-semibold hover:bg-green-800"
            label={`Call ${lead.fullName}`}
            phone={lead.phone}
          />
        </div>
      </div>

      <LeadActions leadId={lead.id} currentStatus={lead.status} />

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Call History</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {lead.callLogs.map((c) => (
            <li key={c.id} className="py-2">
              {c.outcome} at {c.createdAt.toLocaleString()}{c.notes ? ` — ${c.notes}` : ""}
            </li>
          ))}
          {lead.callLogs.length === 0 && <li className="py-2 text-slate-500">No calls logged yet.</li>}
        </ul>
      </section>
    </div>
  );
}
