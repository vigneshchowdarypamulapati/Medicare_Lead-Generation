"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Agent = { id: string; name: string; approved: boolean };

export default function AssignForm({ leadId, agents }: { leadId: string; agents: Agent[] }) {
  const router = useRouter();
  const [agentId, setAgentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!agentId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/leads/${leadId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      if (res.status !== 200) {
        let body: { error?: string } = {};
        try {
          body = (await res.json()) as { error?: string };
        } catch {
          // Non-JSON error response; fall through to the generic message.
        }
        setError(body.error ?? "Failed to assign");
        return;
      }

      setAgentId("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const approvedAgents = agents.filter((a) => a.approved);

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="agentId" className="block text-sm font-medium text-slate-700 mb-1">Assign to agent</label>
        <select
          id="agentId"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 min-w-[220px]"
        >
          <option value="">Select an approved agent</option>
          {approvedAgents.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.name}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting || !agentId}
        className="rounded-lg bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 disabled:opacity-60"
      >
        {submitting ? "Assigning..." : "Assign"}
      </button>
      {error && <p className="text-sm text-red-600 w-full">{error}</p>}
    </form>
  );
}
