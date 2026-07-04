"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Agent = { id: string; name: string; email: string; phone: string | null; approved: boolean; active: boolean };

export default function AgentManager({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status !== 201) {
        let body: { error?: string } = {};
        try {
          body = (await res.json()) as { error?: string };
        } catch {
          // Non-JSON error response; fall through to the generic message.
        }
        setError(body.error ?? "Failed to create agent");
        return;
      }

      form.reset();
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleApproval(agentId: string, approved: boolean) {
    setToggleError(null);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !approved }),
      });

      if (!res.ok) {
        let body: { error?: string } = {};
        try {
          body = (await res.json()) as { error?: string };
        } catch {
          // Non-JSON error response; fall through to the generic message.
        }
        setToggleError(body.error ?? "Failed to update approval");
        return;
      }

      router.refresh();
    } catch {
      setToggleError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Add Agent</h2>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <input name="name" placeholder="Full name" required className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="email" type="email" placeholder="Email" required className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="phone" placeholder="Phone" className="rounded-lg border border-slate-300 px-3 py-2" />
          <input name="password" type="password" placeholder="Temporary password" required className="rounded-lg border border-slate-300 px-3 py-2" />
          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 rounded-lg bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Agent"}
          </button>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-3">Agents</h2>
        {toggleError && <p className="mb-3 text-sm text-red-600">{toggleError}</p>}
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{agent.name}</td>
                <td className="px-4 py-2">{agent.email}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${agent.approved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {agent.approved ? "Approved" : "Pending"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => toggleApproval(agent.id, agent.approved)} className="text-green-700 hover:underline">
                    {agent.approved ? "Revoke approval" : "Approve"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
