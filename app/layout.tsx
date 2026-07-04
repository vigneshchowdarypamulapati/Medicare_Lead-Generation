import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Medicare Education & Coverage Guidance",
    template: "%s | Medicare Coverage Guidance",
  },
  description:
    "Free, education-focused Medicare guidance. Understand Medicare Advantage, Medicare Supplement, and enrollment periods, and find coverage that fits your needs.",
  openGraph: {
    title: "Medicare Education & Coverage Guidance",
    description:
      "We help you understand your Medicare options and find coverage that fits your needs. Education-focused, not sales-driven.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
