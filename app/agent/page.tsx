import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

export default async function AgentLeadsPage() {
  const user = await getSessionUser();
  const leads = await db.lead.findMany({
    where: { assignedToId: user!.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Leads</h1>
      <div className="grid gap-4">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`/agent/leads/${lead.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-green-300"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{lead.fullName}</span>
              <span className="rounded-full bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold">
                {lead.status}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">{lead.phone} · ZIP {lead.zip}</p>
          </Link>
        ))}
        {leads.length === 0 && <p className="text-slate-500">No leads assigned to you yet.</p>}
      </div>
    </div>
  );
}
