"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { readLang, type Lang } from "@/lib/lang";

/**
 * Landing page for the unsubscribe link in marketing emails.
 *
 * Unsubscribing happens on arrival, without asking the person to sign in or
 * press anything: making someone work for it is exactly the pattern the rule
 * exists to prevent. The page then just confirms what happened.
 */
function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get("t") ?? "";
  const [lang, setLang] = useState<Lang>("hu");
  const [state, setState] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    setLang(readLang());
  }, []);

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    fetch("/api/marketing/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => setState(r.ok ? "done" : "error"))
      .catch(() => setState("error"));
  }, [token]);

  const hu = lang === "hu";
  const copy = {
    working: hu ? "Leiratkozás folyamatban…" : "Unsubscribing…",
    doneTitle: hu ? "Leiratkoztál" : "You're unsubscribed",
    doneBody: hu
      ? "Nem küldünk több hírlevelet. A fiókod és a scanjeid érintetlenek maradnak, és a szolgáltatással kapcsolatos fontos leveleket (pl. jelszó-visszaállítás) továbbra is megkapod."
      : "We won't send you any more newsletters. Your account and scans are untouched, and you'll still get essential service emails such as password resets.",
    errorTitle: hu ? "Nem sikerült" : "Something went wrong",
    errorBody: hu
      ? "Ez a leiratkozó link érvénytelen vagy hiányos. Bejelentkezés után a fiókodban is kikapcsolhatod a hírlevelet."
      : "This unsubscribe link is invalid or incomplete. You can also turn the newsletter off in your account settings after signing in.",
    back: hu ? "Vissza a FitFlipre" : "Back to FitFlip",
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-16 bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-50">
      <div className="max-w-md w-full text-center">
        <p className="font-display text-2xl font-semibold mb-6">FitFlip</p>

        {state === "working" && (
          <p className="text-ink-500 dark:text-ink-400">{copy.working}</p>
        )}

        {state === "done" && (
          <>
            <h1 className="text-xl font-medium mb-3">{copy.doneTitle}</h1>
            <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
              {copy.doneBody}
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="text-xl font-medium mb-3">{copy.errorTitle}</h1>
            <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
              {copy.errorBody}
            </p>
          </>
        )}

        <Link
          href="/"
          className="inline-block mt-8 px-6 py-2.5 rounded-full bg-ink-900 dark:bg-ink-700 text-white text-sm font-medium hover:bg-ink-700 transition"
        >
          {copy.back}
        </Link>
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}
