"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { translations, type Lang } from "@/lib/translations";
import LegalFooter from "@/components/LegalFooter";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [lang, setLang] = useState<Lang>("hu");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];

  useEffect(() => {
    const stored = localStorage.getItem("ff_lang");
    if (stored === "hu" || stored === "en") setLang(stored);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) {
      console.error("[forgot-password] error:", error);
      setError(`${t.loginError} (${error.message})`);
      return;
    }
    setSent(true);
  };

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-ink-100">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-display tracking-tight">FitFlip</span>
          <span className="text-xs text-ink-500 hidden sm:inline">.app</span>
        </Link>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm fade-in">
          <h1 className="text-3xl font-display tracking-tight mb-2 text-center">
            {t.forgotPasswordTitle}
          </h1>
          <p className="text-ink-500 text-sm text-center mb-8">
            {t.forgotPasswordSub}
          </p>

          {sent ? (
            <div className="border border-ink-100 rounded-2xl p-6 bg-ink-50 text-center">
              <p className="font-medium mb-1">✓</p>
              <p className="text-sm text-ink-700">{t.forgotPasswordSent}</p>
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
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-100 focus:border-ink-900 focus:outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full px-6 py-3 rounded-full bg-ink-900 text-white font-medium hover:bg-ink-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "…" : t.forgotPasswordSubmit}
              </button>
            </form>
          )}

          {error && (
            <p className="text-center text-red-600 text-sm mt-4">{error}</p>
          )}

          <p className="text-center text-sm text-ink-500 mt-8">
            <Link href="/login" className="text-ink-900 font-medium underline underline-offset-2">
              {t.forgotPasswordBackToLogin}
            </Link>
          </p>
        </div>
      </section>
      <footer className="px-6 py-6 border-t border-ink-100">
        <LegalFooter />
      </footer>
    </main>
  );
}
