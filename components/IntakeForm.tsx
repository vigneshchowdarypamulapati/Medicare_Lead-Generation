"use client";

import { useState, type FormEvent } from "react";

type Errors = Record<string, string>;

export default function IntakeForm() {
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setSubmitting(false);

    if (res.status === 201) {
      setSubmitted(true);
      form.reset();
      return;
    }

    const body = (await res.json()) as { errors?: Errors };
    setErrors(body.errors ?? { form: "Something went wrong. Please try again." });
  }

  if (submitted) {
    return (
      <div id="intake-form" className="rounded-xl bg-green-50 border border-green-200 p-8 text-center">
        <h3 className="text-xl font-bold text-green-800 mb-2">Thank you!</h3>
        <p className="text-slate-700">
          A licensed Medicare advocate will reach out to you shortly. If your matter is urgent, feel free to call us directly.
        </p>
      </div>
    );
  }

  return (
    <form id="intake-form" onSubmit={handleSubmit} className="rounded-xl bg-white border border-green-200 shadow-sm p-6 md:p-8 grid gap-4">
      <input type="text" name="honeypot" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="fullName">Full name *</label>
        <input id="fullName" name="fullName" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        {errors.fullName && <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="phone">Phone *</label>
          <input id="phone" name="phone" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="zip">ZIP code *</label>
          <input id="zip" name="zip" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          {errors.zip && <p className="text-sm text-red-600 mt-1">{errors.zip}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="ageBracket">Age range</label>
          <select id="ageBracket" name="ageBracket" className="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">Prefer not to say</option>
            <option value="Under 65">Under 65</option>
            <option value="65-70">65-70</option>
            <option value="71-75">71-75</option>
            <option value="76+">76+</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="preferredContactTime">Best time to call</label>
          <select id="preferredContactTime" name="preferredContactTime" className="w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">No preference</option>
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
            <option value="Evening">Evening</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="currentCoverage">Current coverage</label>
        <input id="currentCoverage" name="currentCoverage" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="notes">Anything else we should know?</label>
        <textarea id="notes" name="notes" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>

      {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors"
      >
        {submitting ? "Submitting..." : "Speak with a Medicare Advocate"}
      </button>
    </form>
  );
}
