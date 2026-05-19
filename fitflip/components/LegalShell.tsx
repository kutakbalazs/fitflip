"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export type LegalLang = "hu" | "en";

type Props = {
  titleHu: string;
  titleEn: string;
  effectiveDate: string;
  children: (lang: LegalLang) => React.ReactNode;
};

export default function LegalShell({ titleHu, titleEn, effectiveDate, children }: Props) {
  const [lang, setLang] = useState<LegalLang>("hu");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ff-lang");
      if (saved === "hu" || saved === "en") setLang(saved);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setAndPersist = (l: LegalLang) => {
    setLang(l);
    try {
      localStorage.setItem("ff-lang", l);
    } catch {
      /* ignore */
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-white">
      <header className="px-6 py-5 flex items-center justify-between border-b border-ink-100">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-medium tracking-tight">FitFlip</span>
          <span className="text-xs text-ink-500 hidden sm:inline">.app</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center text-xs">
            <button
              type="button"
              onClick={() => setAndPersist("hu")}
              className={`px-2 py-1 rounded ${lang === "hu" ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900"}`}
            >
              HU
            </button>
            <button
              type="button"
              onClick={() => setAndPersist("en")}
              className={`px-2 py-1 rounded ${lang === "en" ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900"}`}
            >
              EN
            </button>
          </div>
          <Link href="/" className="text-sm text-ink-500 hover:text-ink-900 transition">
            {lang === "hu" ? "← Vissza" : "← Back"}
          </Link>
        </div>
      </header>

      <section className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-display tracking-tight mb-2">
          {lang === "hu" ? titleHu : titleEn}
        </h1>
        <p className="text-xs text-ink-500 mb-8">
          {lang === "hu" ? "Hatálybalépés" : "Effective date"}: {effectiveDate}
        </p>

        <div className="prose prose-sm max-w-none text-ink-900 leading-relaxed">
          {ready && children(lang)}
        </div>

        <nav className="mt-12 pt-6 border-t border-ink-100 flex flex-wrap gap-4 text-xs text-ink-500">
          <Link href="/terms" className="hover:text-ink-900">
            {lang === "hu" ? "ÁSZF" : "Terms"}
          </Link>
          <Link href="/privacy" className="hover:text-ink-900">
            {lang === "hu" ? "Adatvédelem" : "Privacy"}
          </Link>
          <Link href="/cookies" className="hover:text-ink-900">
            {lang === "hu" ? "Sütik" : "Cookies"}
          </Link>
        </nav>
      </section>
    </main>
  );
}
