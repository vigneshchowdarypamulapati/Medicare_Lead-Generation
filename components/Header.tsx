import Link from "next/link";
import ClickToCallButton from "./ClickToCallButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-green-100">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-green-800">
          Medicare Coverage Guidance
        </Link>
        <nav className="hidden md:flex gap-6 text-sm text-slate-700">
          <Link href="/medicare-advantage" className="hover:text-green-800">Medicare Advantage</Link>
          <Link href="/medicare-supplement" className="hover:text-green-800">Medicare Supplement</Link>
          <Link href="/enrollment-periods" className="hover:text-green-800">Enrollment Periods</Link>
          <Link href="/faq" className="hover:text-green-800">FAQ</Link>
        </nav>
        <ClickToCallButton className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white font-semibold hover:bg-green-800 transition-colors" />
      </div>
    </header>
  );
}
