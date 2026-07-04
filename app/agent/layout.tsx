import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import SignOutButton from "@/app/SignOutButton";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.role !== "AGENT") {
    redirect("/login");
  }

  const unreadCount = await db.lead.count({ where: { assignedToId: user.id, status: "NEW" } });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <Link href="/agent" className="font-bold text-green-800 flex items-center gap-2">
            My Leads
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-600 text-white text-xs px-2 py-0.5">{unreadCount}</span>
            )}
          </Link>
          <SignOutButton className="text-sm text-slate-700 hover:text-green-800" />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
