"use client";

import { useId, useState } from "react";

type FaqItem = { question: string; answer: string };

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
      {items.map((item, index) => {
        const open = openIndex === index;
        const buttonId = `${baseId}-faq-button-${index}`;
        const panelId = `${baseId}-faq-panel-${index}`;
        return (
          <div key={item.question}>
            <button
              type="button"
              id={buttonId}
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-slate-800"
              aria-expanded={open}
              aria-controls={panelId}
            >
              {item.question}
              <span className="text-green-700">{open ? "−" : "+"}</span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="px-5 pb-4 text-sm text-slate-600"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
