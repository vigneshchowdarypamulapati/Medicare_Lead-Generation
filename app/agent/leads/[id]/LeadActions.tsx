"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = ["NEW", "CONTACTED", "APPOINTMENT_SET", "SOLD", "CLOSED", "NOT_INTERESTED"];
const OUTCOMES = ["ANSWERED", "MISSED", "VOICEMAIL"];

export default function LeadActions({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [outcome, setOutcome] = useState("ANSWERED");
  const [notes, setNotes] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingCall, setSavingCall] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  async function updateStatus(event: React.FormEvent) {
    event.preventDefault();
    setSavingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/agent/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        let body: { error?: string } = {};
        try {
          body = (await res.json()) as { error?: string };
        } catch {
          // Non-JSON error response; fall through to the generic message.
        }
        setStatusError(body.error ?? "Failed to update status");
        return;
      }

      router.refresh();
    } catch {
      setStatusError("Something went wrong. Please try again.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function logCall(event: React.FormEvent) {
    event.preventDefault();
    setSavingCall(true);
    setCallError(null);
    try {
      const res = await fetch(`/api/agent/leads/${leadId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notes }),
      });

      if (!res.ok) {
        let body: { error?: string } = {};
        try {
          body = (await res.json()) as { error?: string };
        } catch {
          // Non-JSON error response; fall through to the generic message.
        }
        setCallError(body.error ?? "Failed to log call");
        return;
      }

      setNotes("");
      router.refresh();
    } catch {
      setCallError("Something went wrong. Please try again.");
    } finally {
      setSavingCall(false);
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={updateStatus} className="rounded-xl border border-slate-200 bg-white p-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">Lead status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={savingStatus} className="rounded-lg bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 disabled:opacity-60">
          {savingStatus ? "Saving..." : "Update Status"}
        </button>
        {statusError && <p className="text-sm text-red-600 w-full">{statusError}</p>}
      </form>

      <form onSubmit={logCall} className="rounded-xl border border-slate-200 bg-white p-6 grid gap-3">
        <h2 className="font-bold text-slate-900">Log a Call</h2>
        <div>
          <label htmlFor="outcome" className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
          <select id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <button type="submit" disabled={savingCall} className="rounded-lg bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 disabled:opacity-60 w-fit">
          {savingCall ? "Saving..." : "Log Call"}
        </button>
        {callError && <p className="text-sm text-red-600">{callError}</p>}
      </form>
    </div>
  );
}
