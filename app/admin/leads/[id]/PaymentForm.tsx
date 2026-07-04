"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Payment = { id: string; amount: number; type: string; status: "PAID" | "UNPAID" };

export default function PaymentForm({ leadId, payments }: { leadId: string; payments: Payment[] }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("SOLD");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    await fetch(`/api/admin/leads/${leadId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), type }),
    });
    setSubmitting(false);
    setAmount("");
    router.refresh();
  }

  async function toggle(paymentId: string, current: "PAID" | "UNPAID") {
    await fetch(`/api/admin/leads/${leadId}/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: current === "PAID" ? "UNPAID" : "PAID" }),
    });
    router.refresh();
  }

  return (
    <div>
      <ul className="mb-4 divide-y divide-slate-100">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-2 text-sm">
            <span>${p.amount.toFixed(2)} — {p.type}</span>
            <button
              onClick={() => toggle(p.id, p.status)}
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                p.status === "PAID" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {p.status}
            </button>
          </li>
        ))}
        {payments.length === 0 && <li className="py-2 text-sm text-slate-500">No payments recorded.</li>}
      </ul>
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
          <input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="BILLED">Billed</option>
            <option value="BOOKED">Booked</option>
            <option value="SOLD">Sold</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 disabled:opacity-60"
        >
          Add Payment
        </button>
      </form>
    </div>
  );
}
