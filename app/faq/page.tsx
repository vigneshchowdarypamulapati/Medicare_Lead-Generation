import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "Medicare FAQ",
  description: "Answers to common Medicare questions: enrollment periods, plan types, costs, and how to get help choosing coverage.",
};

const faqItems = [
  {
    question: "What is the difference between Medicare Advantage and Medicare Supplement?",
    answer:
      "Medicare Advantage (Part C) bundles your hospital, medical, and often drug coverage into one plan, typically through a private insurer network. Medicare Supplement (Medigap) works alongside Original Medicare to help cover out-of-pocket costs like copays and deductibles, and generally offers more flexibility in choosing providers.",
  },
  {
    question: "When can I enroll in Medicare?",
    answer:
      "Your Initial Enrollment Period (IEP) is a 7-month window around your 65th birthday. The Annual Enrollment Period (AEP) runs October 15 through December 7 each year. Special Enrollment Periods (SEP) may apply if you have a qualifying life event.",
  },
  {
    question: "Does it cost anything to talk to a Medicare advocate?",
    answer: "No, our Medicare education guidance is provided at no cost to you.",
  },
  {
    question: "Will I be pressured into buying a plan?",
    answer:
      "No. We are education-focused, not sales-driven. An advocate can walk you through your options, but the decision is always yours.",
  },
  {
    question: "What if I miss my enrollment window?",
    answer:
      "You may have to wait for the next enrollment period, or you may qualify for a Special Enrollment Period depending on your situation. An advocate can help you understand what applies to you.",
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

export default function FaqPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold text-green-800 mb-6">Medicare FAQ</h1>
        <FaqAccordion items={faqItems} />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
