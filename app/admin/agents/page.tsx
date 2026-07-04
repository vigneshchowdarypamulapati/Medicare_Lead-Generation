import { db } from "@/lib/db";
import AgentManager from "./AgentManager";

export default async function AdminAgentsPage() {
  const agents = await db.user.findMany({
    where: { role: "AGENT" },
    select: { id: true, name: true, email: true, phone: true, approved: true, active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Agent Management</h1>
      <AgentManager agents={agents} />
    </div>
  );
}
