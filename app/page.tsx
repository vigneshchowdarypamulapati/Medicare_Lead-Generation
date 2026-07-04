import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClickToCallButton from "@/components/ClickToCallButton";
import IntakeForm from "@/components/IntakeForm";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "Medicare Education & Coverage Guidance",
  description:
    "We help you understand your Medicare options and find coverage that fits your needs. Education-focused, not sales-driven. Speak with a licensed Medicare advocate today.",
};

const faqItems = [
  {
    question: "Is this a government website?",
    answer:
      "No. We are an independent Medicare education service and are not affiliated with or endorsed by the U.S. government or the federal Medicare program.",
  },
  {
    question: "Will I be pressured to buy a plan?",
    answer:
      "No. Our goal is to help you understand your options. Any licensed advocate you speak with can walk you through coverage choices, but the decision is always yours.",
  },
  {
    question: "Is there a cost to speak with an advocate?",
    answer: "No, guidance is provided at no cost to you.",
  },
  {
    question: "What information do I need to have ready?",
    answer:
      "It helps to have your current coverage details on hand, but it's not required. An advocate can walk you through everything.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="bg-gradient-to-b from-green-50 to-white">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 mb-4">
              Medicare Education &amp; Coverage Guidance
            </h1>
            <p className="text-lg text-slate-700 mb-8 max-w-2xl mx-auto">
              We help you understand your Medicare options and find coverage that fits your needs.
              Education-focused, not sales-driven.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="#intake-form"
                className="rounded-lg bg-green-700 px-6 py-3 text-white font-semibold hover:bg-green-800 transition-colors"
              >
                Speak with a Medicare Advocate
              </a>
              <ClickToCallButton className="rounded-lg border-2 border-green-700 px-6 py-3 text-green-800 font-semibold hover:bg-green-50 transition-colors" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 grid gap-8 md:grid-cols-3">
          <article className="rounded-xl border border-green-100 p-6">
            <h2 className="text-lg font-bold text-green-800 mb-2">Understand Your Options</h2>
            <p className="text-slate-700 text-sm">
              Learn the differences between{" "}
              <Link href="/medicare-advantage" className="underline hover:text-green-800">Medicare Advantage</Link>{" "}
              and{" "}
              <Link href="/medicare-supplement" className="underline hover:text-green-800">Medicare Supplement</Link>{" "}
              plans in plain language.
            </p>
          </article>
          <article className="rounded-xl border border-green-100 p-6">
            <h2 className="text-lg font-bold text-green-800 mb-2">Know Your Timing</h2>
            <p className="text-slate-700 text-sm">
              Missing an{" "}
              <Link href="/enrollment-periods" className="underline hover:text-green-800">enrollment period</Link>{" "}
              can limit your options. We help you understand key deadlines.
            </p>
          </article>
          <article className="rounded-xl border border-green-100 p-6">
            <h2 className="text-lg font-bold text-green-800 mb-2">Talk to a Real Person</h2>
            <p className="text-slate-700 text-sm">
              A licensed Medicare advocate can answer your questions directly — no pressure, no obligation.
            </p>
          </article>
        </section>

        <section className="bg-green-50 py-16">
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="text-2xl font-bold text-green-800 mb-6 text-center">
              Request Your Free Coverage Guidance
            </h2>
            <IntakeForm />
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-2xl font-bold text-green-800 mb-6">Frequently Asked Questions</h2>
          <FaqAccordion items={faqItems} />
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
