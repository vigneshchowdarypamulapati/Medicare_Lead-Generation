import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickToCallButton from "@/components/ClickToCallButton";

export const metadata: Metadata = {
  title: "Medicare Supplement (Medigap) Explained",
  description:
    "Learn how Medicare Supplement (Medigap) plans work alongside Original Medicare to help cover out-of-pocket costs. Free, education-focused guidance.",
};

export default function MedicareSupplementPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold text-green-800 mb-4">Medicare Supplement (Medigap) Explained</h1>
        <p className="text-slate-700 mb-4">
          Medicare Supplement, also called Medigap, is coverage sold by private insurers that works
          alongside Original Medicare (Parts A and B). It helps pay for costs Original Medicare
          doesn&apos;t cover, such as copayments, coinsurance, and deductibles.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">How it differs from Medicare Advantage</h2>
        <p className="text-slate-700 mb-4">
          Medigap plans generally let you see any doctor who accepts Medicare, nationwide, without
          needing referrals. They don&apos;t typically include drug coverage, so most people pair a
          Medigap plan with a separate Part D prescription drug plan. Compare this to{" "}
          <Link href="/medicare-advantage" className="underline hover:text-green-800">Medicare Advantage</Link>,
          which bundles coverage but usually restricts you to a network.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">When to enroll</h2>
        <p className="text-slate-700 mb-4">
          The best time to buy a Medigap policy is typically during your Medigap Open Enrollment
          Period, when you can't be denied coverage or charged more due to health conditions. See our{" "}
          <Link href="/enrollment-periods" className="underline hover:text-green-800">enrollment periods</Link>{" "}
          guide for details.
        </p>
        <div className="mt-10 rounded-xl bg-green-50 border border-green-200 p-6 text-center">
          <p className="text-slate-700 mb-4">Not sure if Medigap is right for you? Talk to a licensed advocate at no cost.</p>
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
