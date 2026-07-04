import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import AssignForm from "./AssignForm";
import PaymentForm from "./PaymentForm";

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [lead, agents, payments, notifications] = await Promise.all([
    db.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        statusHistory: { orderBy: { createdAt: "desc" }, include: { changedBy: true } },
        assignments: { orderBy: { createdAt: "desc" }, include: { toAgent: true, fromAgent: true, assignedBy: true } },
        callLogs: { orderBy: { createdAt: "desc" }, include: { agent: true } },
      },
    }),
    db.user.findMany({ where: { role: "AGENT" }, select: { id: true, name: true, approved: true } }),
    db.payment.findMany({ where: { leadId: id }, orderBy: { createdAt: "desc" } }),
    db.notificationLog.findMany({ where: { leadId: id }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!lead) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{lead.fullName}</h1>
        <p className="text-slate-600">{lead.phone} · {lead.email ?? "no email"} · ZIP {lead.zip}</p>
        <span className="inline-block mt-2 rounded-full bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold">
          {lead.status}
        </span>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Assignment</h2>
        <p className="text-sm text-slate-600 mb-3">
          Currently assigned to: <strong>{lead.assignedTo?.name ?? "Unassigned"}</strong>
        </p>
        <AssignForm leadId={lead.id} agents={agents} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Payments</h2>
        <PaymentForm leadId={lead.id} payments={payments} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Status History</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {lead.statusHistory.map((h) => (
            <li key={h.id} className="py-2">
              {h.fromStatus ?? "—"} → {h.toStatus} by {h.changedBy.name} at {h.createdAt.toLocaleString()}
            </li>
          ))}
          {lead.statusHistory.length === 0 && <li className="py-2 text-slate-500">No status changes yet.</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Assignment Audit Trail</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {lead.assignments.map((a) => (
            <li key={a.id} className="py-2">
              {a.fromAgent?.name ?? "Unassigned"} → {a.toAgent.name} by {a.assignedBy.name} at {a.createdAt.toLocaleString()}
            </li>
          ))}
          {lead.assignments.length === 0 && <li className="py-2 text-slate-500">No assignments yet.</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Call Log</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {lead.callLogs.map((c) => (
            <li key={c.id} className="py-2">
              {c.outcome} by {c.agent.name} at {c.createdAt.toLocaleString()}
              {c.notes ? ` — ${c.notes}` : ""}
            </li>
          ))}
          {lead.callLogs.length === 0 && <li className="py-2 text-slate-500">No calls logged yet.</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Notification Log</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {notifications.map((n) => (
            <li key={n.id} className="py-2">
              {n.recipientType} via {n.channel}: {n.status} at {n.createdAt.toLocaleString()}
            </li>
          ))}
          {notifications.length === 0 && <li className="py-2 text-slate-500">No notifications sent yet.</li>}
        </ul>
      </section>
    </div>
  );
}
