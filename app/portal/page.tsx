import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import ClickToCallButton from "@/components/ClickToCallButton";

export default async function PortalPage() {
  const user = await getSessionUser();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h1>
        <p className="text-slate-600 mt-1">Thanks for creating your account.</p>
      </div>

      <section className="rounded-xl border border-green-200 bg-green-50 p-6">
        <h2 className="font-bold text-green-800 mb-2">Your dashboard is coming soon</h2>
        <p className="text-slate-700 mb-4">
          You&apos;ll soon be able to track your request, see the agent assigned to help you, and
          view your appointment details here. In the meantime, a licensed Medicare advocate can
          assist you directly.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/#intake-form"
            className="rounded-lg bg-green-700 px-4 py-2 text-white font-semibold hover:bg-green-800 transition-colors"
          >
            Request guidance
          </Link>
          <ClickToCallButton className="rounded-lg border-2 border-green-700 px-4 py-2 text-green-800 font-semibold hover:bg-green-100 transition-colors" />
        </div>
      </section>
    </div>
  );
}
