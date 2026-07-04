"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FALLBACK_ERROR = "Something went wrong. Please try again or call us.";

const HOME_BY_ROLE: Record<"ADMIN" | "AGENT" | "LEAD", string> = {
  ADMIN: "/admin",
  AGENT: "/agent",
  LEAD: "/portal",
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status !== 200) {
        let body: { error?: string } = {};
        try {
          body = (await res.json()) as { error?: string };
        } catch {
          // Non-JSON response body; fall through to the fallback error below.
        }
        setError(body.error ?? "Login failed");
        return;
      }

      const body = (await res.json()) as { role: "ADMIN" | "AGENT" | "LEAD" };
      router.push(HOME_BY_ROLE[body.role] ?? "/");
      router.refresh();
    } catch {
      setError(FALLBACK_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-white border border-green-200 shadow-sm p-8 grid gap-4">
        <h1 className="text-xl font-bold text-green-800 text-center">Staff Login</h1>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input id="email" name="email" type="email" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input id="password" name="password" type="password" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
        <p className="text-sm text-slate-600 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-green-700 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </main>
  );
}
