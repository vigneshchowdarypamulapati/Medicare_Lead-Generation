"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className={className ?? "text-sm text-slate-700 hover:text-green-800"}>
      Sign out
    </button>
  );
}
