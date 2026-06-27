"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { translations, type Lang } from "@/lib/translations";
import LegalFooter from "@/components/LegalFooter";

export default function ForgotPasswordPage() {
  const [lang, setLang] = useState<Lang>("hu");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Supabase rate-limits recovery emails to ~once per 60s per address, so the
  // resend button counts down before it's tappable again.
  const [cooldown, setCooldown] = useState(0);
  // Spins the resend arrow for a visible beat after a tap.
  const [resending, setResending] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    const stored = (localStorage.getItem("ff-lang") ?? localStorage.getItem("ff_lang"));
    if (stored === "hu" || stored === "en") setLang(stored);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Go through our own endpoint so the stored language can be refreshed to the
  // current app language before Supabase renders the recovery email. Always
  // treated as success (no email-enumeration leak).
  const sendReset = async () => {
    try {
      await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, lang }),
      });
    } catch (err) {
      console.error("[forgot-password] error:", err);
    }
    setCooldown(60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    await sendReset();
    setLoading(false);
    setSent(true);
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    // Keep the arrow spinning for at least one full turn even if the request
    // finishes instantly, so the resend feels acknowledged.
    await Promise.all([sendReset(), new Promise((r) => setTimeout(r, 800))]);
    setResending(false);
  };

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-6 pb-5 safe-pt-5 flex items-center justify-between border-b border-ink-100 dark:border-ink-700">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-display tracking-tight">FitFlip</span>
          <span className="text-xs text-ink-500 dark:text-ink-400 hidden sm:inline">.app</span>
        </Link>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm fade-in">
          <h1 className="text-3xl font-display tracking-tight mb-2 text-center">
            {t.forgotPasswordTitle}
          </h1>
          <p className="text-ink-500 dark:text-ink-400 text-sm text-center mb-8">
            {t.forgotPasswordSub}
          </p>

          {sent ? (
            <div className="border border-ink-100 dark:border-ink-700 rounded-2xl p-6 bg-ink-50 dark:bg-ink-800 text-center">
              <p className="font-medium mb-1">✓</p>
              <p className="text-sm text-ink-700 dark:text-ink-200 mb-4">{t.forgotPasswordSent}</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-ink-200 dark:border-ink-600 text-sm font-medium text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={resending ? "animate-spin" : ""}
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                {cooldown > 0
                  ? t.forgotPasswordResendIn.replace("{s}", String(cooldown))
                  : t.forgotPasswordResend}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                  {t.loginEmailLabel}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.loginEmailPlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-100 dark:border-ink-700 focus:border-ink-900 focus:outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full px-6 py-3 rounded-full bg-ink-900 dark:bg-ink-700 text-white font-medium hover:bg-ink-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "…" : t.forgotPasswordSubmit}
              </button>
            </form>
          )}

          {error && (
            <p className="text-center text-red-600 text-sm mt-4">{error}</p>
          )}

          <p className="text-center text-sm text-ink-500 dark:text-ink-400 mt-8">
            <Link href="/login" className="text-ink-900 dark:text-ink-50 font-medium underline underline-offset-2">
              {t.forgotPasswordBackToLogin}
            </Link>
          </p>
        </div>
      </section>
      <footer className="px-6 py-6 border-t border-ink-100 dark:border-ink-700">
        <LegalFooter />
      </footer>
    </main>
  );
}
