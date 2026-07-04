import Link from "next/link";
import ClickToCallButton from "@/components/ClickToCallButton";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-16">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <p className="font-semibold text-white mb-2">Medicare Coverage Guidance</p>
          <p>Education-focused Medicare guidance to help you understand your options. Not affiliated with or endorsed by the U.S. government or the federal Medicare program.</p>
        </div>
        <div>
          <p className="font-semibold text-white mb-2">Learn</p>
          <ul className="space-y-1">
            <li><Link href="/medicare-advantage" className="hover:text-white">Medicare Advantage</Link></li>
            <li><Link href="/medicare-supplement" className="hover:text-white">Medicare Supplement</Link></li>
            <li><Link href="/enrollment-periods" className="hover:text-white">Enrollment Periods</Link></li>
            <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white mb-2">Get Help</p>
          <p>Speak with a licensed Medicare advocate about your coverage options.</p>
          <Link href="/#intake-form" className="hover:text-white underline">Request a callback</Link>
          <div className="mt-3">
            <ClickToCallButton className="inline-block rounded-lg bg-green-700 px-4 py-2 text-white text-sm font-semibold hover:bg-green-600 transition-colors" />
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Medicare Coverage Guidance. All rights reserved.
      </div>
    </footer>
  );
}
