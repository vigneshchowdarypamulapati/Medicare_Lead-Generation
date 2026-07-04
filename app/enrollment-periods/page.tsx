import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickToCallButton from "@/components/ClickToCallButton";

export const metadata: Metadata = {
  title: "Medicare Enrollment Periods Explained",
  description:
    "Understand the Initial, Annual, and Special Enrollment Periods for Medicare so you don't miss your window to enroll or change plans.",
};

export default function EnrollmentPeriodsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold text-green-800 mb-4">Medicare Enrollment Periods Explained</h1>
        <p className="text-slate-700 mb-4">
          Enrolling in Medicare — or changing your plan — is only possible during specific windows.
          Missing these can mean waiting months for your next chance, or paying a late enrollment penalty.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">Initial Enrollment Period (IEP)</h2>
        <p className="text-slate-700 mb-4">
          A 7-month window: it starts 3 months before the month you turn 65, includes your birthday
          month, and extends 3 months after.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">Annual Enrollment Period (AEP)</h2>
        <p className="text-slate-700 mb-4">
          Runs October 15 through December 7 every year. During this window you can switch between
          Original Medicare and{" "}
          <Link href="/medicare-advantage" className="underline hover:text-green-800">Medicare Advantage</Link>,
          change Advantage plans, or join/switch a Part D drug plan.
        </p>
        <h2 className="text-xl font-bold text-green-800 mt-8 mb-2">Special Enrollment Period (SEP)</h2>
        <p className="text-slate-700 mb-4">
          Triggered by qualifying life events — such as moving, losing employer coverage, or a plan
          leaving your area — that let you enroll or make changes outside the usual windows.
        </p>
        <p className="text-slate-700 mb-4">
          Not sure which window applies to your situation, or how it affects a{" "}
          <Link href="/medicare-supplement" className="underline hover:text-green-800">Medicare Supplement</Link>{" "}
          decision? An advocate can walk you through it.
        </p>
        <div className="mt-10 rounded-xl bg-green-50 border border-green-200 p-6 text-center">
          <p className="text-slate-700 mb-4">Find out which enrollment period applies to you — at no cost.</p>
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
