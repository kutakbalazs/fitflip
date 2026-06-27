"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { translations, type Lang } from "@/lib/translations";
import LegalFooter from "@/components/LegalFooter";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [lang, setLang] = useState<Lang>("hu");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    const stored = (localStorage.getItem("ff-lang") ?? localStorage.getItem("ff_lang"));
    if (stored === "hu" || stored === "en") setLang(stored);
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login?error=reset-link-invalid");
        return;
      }
      setAuthChecked(true);
    });
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(t.signupWeakPassword);
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      console.error("[reset-password] error:", error);
      setError(`${t.resetPasswordError} (${error.message})`);
      return;
    }
    router.replace("/?password-reset=1");
  };

  if (!authChecked) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <p className="text-ink-500 dark:text-ink-400 text-sm">…</p>
      </main>
    );
  }

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
            {t.resetPasswordTitle}
          </h1>
          <p className="text-ink-500 dark:text-ink-400 text-sm text-center mb-8">
            {t.resetPasswordSub}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                {t.loginPasswordLabel}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.loginPasswordPlaceholder}
                className="w-full px-4 py-2.5 rounded-xl border border-ink-100 dark:border-ink-700 focus:border-ink-900 focus:outline-none text-sm"
              />
              <p className="text-xs text-ink-500 dark:text-ink-400 mt-1.5">{t.signupPasswordHint}</p>
            </div>
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full px-6 py-3 rounded-full bg-ink-900 dark:bg-ink-700 text-white font-medium hover:bg-ink-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "…" : t.resetPasswordSubmit}
            </button>
          </form>

          {error && (
            <p className="text-center text-red-600 text-sm mt-4">{error}</p>
          )}
        </div>
      </section>
      <footer className="px-6 py-6 border-t border-ink-100 dark:border-ink-700">
        <LegalFooter />
      </footer>
    </main>
  );
}
