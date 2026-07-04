import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import SignOutButton from "@/app/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="font-bold text-green-800">Admin Dashboard</Link>
          <nav className="flex gap-4 text-sm text-slate-700 items-center">
            <Link href="/admin" className="hover:text-green-800">Leads</Link>
            <Link href="/admin/agents" className="hover:text-green-800">Agents</Link>
            <SignOutButton className="hover:text-green-800" />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
