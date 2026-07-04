"use client";

import { useState } from "react";
import Link from "next/link";
import ClickToCallButton from "./ClickToCallButton";

const navLinks = [
  { href: "/medicare-advantage", label: "Medicare Advantage" },
  { href: "/medicare-supplement", label: "Medicare Supplement" },
  { href: "/enrollment-periods", label: "Enrollment Periods" },
  { href: "/faq", label: "FAQ" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-green-100">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-green-800">
          Medicare Coverage Guidance
        </Link>
        <nav className="hidden md:flex gap-6 text-sm text-slate-700">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-green-800">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden md:inline text-sm text-slate-700 hover:text-green-800">
            Log in
          </Link>
          <Link
            href="/signup"
            className="hidden md:inline text-sm font-medium text-green-800 hover:underline"
          >
            Sign up
          </Link>
          <ClickToCallButton className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white font-semibold hover:bg-green-800 transition-colors" />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="md:hidden rounded-lg border border-green-200 p-2 text-green-800 hover:bg-green-50 transition-colors"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      <nav
        id="mobile-nav"
        hidden={!menuOpen}
        className="md:hidden border-t border-green-100 bg-white"
      >
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3 text-sm text-slate-700">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-green-800"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-green-100 pt-3 flex flex-col gap-3">
            <Link href="/login" className="hover:text-green-800" onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
            <Link
              href="/signup"
              className="font-medium text-green-800 hover:underline"
              onClick={() => setMenuOpen(false)}
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
