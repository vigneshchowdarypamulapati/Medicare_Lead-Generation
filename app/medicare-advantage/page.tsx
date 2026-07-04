import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickToCallButton from "@/components/ClickToCallButton";

export const metadata: Metadata = {
  title: "Medicare Advantage (Part C) Explained",
  description:
    "Learn how Medicare Advantage plans work, what they cover, and how they compare to Medicare Supplement plans. Free, education-focused guidance.",
};

export default function MedicareAdvantagePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold text-green-800 mb-4">Medicare Advantage (Part C) Explained</h1>
        <p className="text-slate-700 mb-4">
          Medicare Advantage plans are offered by private insurers approved by Medicare. They bundle
          your Part A (hospital) and Part B (medical) coverage into a single plan, and many plans also
          include prescription drug coverage (Part D), plus extras like dental, vision, or hearing benefits.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">How it differs from Original Medicare</h2>
        <p className="text-slate-700 mb-4">
          Unlike Original Medicare, Medicare Advantage plans typically use a network of doctors and
          hospitals, similar to an HMO or PPO. Costs, coverage rules, and out-of-pocket maximums vary
          by plan and by where you live.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">Is it right for you?</h2>
        <p className="text-slate-700 mb-4">
          It depends on your health needs, budget, and preferred doctors. Many people compare Medicare
          Advantage against{" "}
          <Link href="/medicare-supplement" className="underline hover:text-green-800">Medicare Supplement</Link>{" "}
          plans before deciding. Understanding your{" "}
          <Link href="/enrollment-periods" className="underline hover:text-green-800">enrollment period</Link>{" "}
          also matters, since switching plans is generally easiest during specific windows.
        </p>
        <div className="mt-10 rounded-xl bg-green-50 border border-green-200 p-6 text-center">
          <p className="text-slate-700 mb-4">Have questions about Medicare Advantage? Talk to a licensed advocate at no cost.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/#intake-form" className="rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 transition-colors">
              Request Guidance
            </Link>
            <ClickToCallButton className="rounded-lg border-2 border-green-700 px-6 py-3 text-green-800 font-semibold hover:bg-green-50 transition-colors" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
