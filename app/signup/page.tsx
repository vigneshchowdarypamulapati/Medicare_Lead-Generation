"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FALLBACK_ERROR = "Something went wrong. Please try again.";

type Role = "LEAD" | "AGENT";
type FieldErrors = Record<string, string>;

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("LEAD");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agentPending, setAgentPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);

    const form = event.currentTarget;
    const data = { ...Object.fromEntries(new FormData(form).entries()), role };

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status === 201) {
        let body: { role?: Role; status?: string } = {};
        try {
          body = await res.json();
        } catch {
          // Non-JSON body; treat as success and route by the chosen role below.
        }
        if (role === "AGENT" || body.status === "pending_approval") {
          setAgentPending(true);
          return;
        }
        router.push("/portal");
        router.refresh();
        return;
      }

      let body: { errors?: FieldErrors; error?: string } = {};
      try {
        body = await res.json();
      } catch {
        // Non-JSON error body; fall through to the generic message.
      }
      if (body.errors) setErrors(body.errors);
      else setFormError(body.error ?? FALLBACK_ERROR);
    } catch {
      setFormError(FALLBACK_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  if (agentPending) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-green-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white border border-green-200 shadow-sm p-8 text-center">
          <h1 className="text-xl font-bold text-green-800 mb-2">Account created</h1>
          <p className="text-slate-700 mb-4">
            Your agent account is awaiting admin approval. You&apos;ll be able to sign in and
            receive leads once an administrator approves your account.
          </p>
          <Link href="/login" className="text-green-700 font-medium hover:underline">
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-green-50 px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white border border-green-200 shadow-sm p-8 grid gap-4"
      >
        <h1 className="text-xl font-bold text-green-800 text-center">Create your account</h1>

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-1">I am a…</span>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Account type">
            <button
              type="button"
              onClick={() => setRole("LEAD")}
              aria-pressed={role === "LEAD"}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                role === "LEAD"
                  ? "border-green-700 bg-green-700 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => setRole("AGENT")}
              aria-pressed={role === "AGENT"}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                role === "AGENT"
                  ? "border-green-700 bg-green-700 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Agent
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {role === "LEAD"
              ? "For people who want help understanding their Medicare options."
              : "For licensed agents. Your account needs admin approval before you can sign in."}
          </p>
        </div>

        {/* Honeypot: hidden from users; bots that fill it are rejected server-side. */}
        <input type="text" name="honeypot" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
          <input
            id="name"
            name="name"
            required
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {errors.name && <p id="name-error" className="text-sm text-red-600 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {errors.email && <p id="email-error" className="text-sm text-red-600 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
            Phone <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {errors.phone && <p id="phone-error" className="text-sm text-red-600 mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {errors.password && <p id="password-error" className="text-sm text-red-600 mt-1">{errors.password}</p>}
          {!errors.password && <p className="text-xs text-slate-500 mt-1">At least 8 characters.</p>}
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-slate-600 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-green-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
