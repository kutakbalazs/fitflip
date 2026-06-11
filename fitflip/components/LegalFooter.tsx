"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { readLang, onLangChange } from "@/lib/lang";

type Props = {
  className?: string;
};

export default function LegalFooter({ className = "" }: Props) {
  const [lang, setLang] = useState<"hu" | "en">("hu");

  useEffect(() => {
    setLang(readLang());
    return onLangChange(setLang);
  }, []);

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-ink-400 dark:text-ink-500 ${className}`}>
      <Link href="/terms" className="hover:text-ink-700 dark:hover:text-ink-200">
        {lang === "hu" ? "ÁSZF" : "Terms"}
      </Link>
      <Link href="/privacy" className="hover:text-ink-700 dark:hover:text-ink-200">
        {lang === "hu" ? "Adatvédelem" : "Privacy"}
      </Link>
      <Link href="/cookies" className="hover:text-ink-700 dark:hover:text-ink-200">
        {lang === "hu" ? "Sütik" : "Cookies"}
      </Link>
    </div>
  );
}
