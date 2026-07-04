import Link from "next/link";
import { db } from "@/lib/db";

export default async function AdminLeadsPage() {
  const leads = await db.lead.findMany({
    include: { assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Lead Inbox</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">ZIP</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{lead.fullName}</td>
                <td className="px-4 py-3">{lead.phone}</td>
                <td className="px-4 py-3">{lead.zip}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold">
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3">{lead.assignedTo?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3">{lead.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/leads/${lead.id}`} className="text-green-700 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
