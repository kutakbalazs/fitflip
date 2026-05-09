"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { translations, type Lang } from "@/lib/translations";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [lang, setLang] = useState<Lang>("hu");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    const stored = localStorage.getItem("ff_lang");
    if (stored === "hu" || stored === "en") setLang(stored);
    else if (typeof navigator !== "undefined" && navigator.language.startsWith("en")) {
      setLang("en");
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/");
    });
  }, [router, supabase]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(t.signupWeakPassword);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      console.error("[signup] error:", error);
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user_already_exists")) {
        setError(t.signupExists);
      } else if (msg.includes("password") && (msg.includes("short") || msg.includes("weak"))) {
        setError(t.signupWeakPassword);
      } else {
        setError(`${t.signupError} (${error.message})`);
      }
      return;
    }
    if (data.session) {
      router.replace("/");
    } else {
      setConfirmSent(true);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(t.signupError);
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-ink-100">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-medium tracking-tight">FitFlip</span>
          <span className="text-xs text-ink-500 hidden sm:inline">.app</span>
        </Link>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm fade-in">
          <h1 className="text-3xl font-display tracking-tight mb-2 text-center">
            {t.signupTitle}
          </h1>
          <p className="text-ink-500 text-sm text-center mb-8">
            {t.signupSub}
          </p>

          {confirmSent ? (
            <div className="border border-ink-100 rounded-2xl p-6 bg-ink-50 text-center">
              <p className="font-medium mb-1">✓</p>
              <p className="text-sm text-ink-700">{t.signupConfirmSent}</p>
            </div>
          ) : (
            <>
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full border border-ink-100 hover:bg-ink-50 transition text-sm font-medium"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t.signupWithGoogle}
              </button>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-ink-100" />
                <span className="text-xs text-ink-500 uppercase tracking-wider">{t.loginOr}</span>
                <div className="flex-1 h-px bg-ink-100" />
              </div>

              <form onSubmit={handleSignUp} className="space-y-3">
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
                    className="w-full px-4 py-2.5 rounded-xl border border-ink-100 focus:border-ink-900 focus:outline-none text-sm"
                  />
                  <p className="text-xs text-ink-500 mt-1.5">{t.signupPasswordHint}</p>
                </div>
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full px-6 py-3 rounded-full bg-ink-900 text-white font-medium hover:bg-ink-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "…" : t.signupSubmit}
                </button>
              </form>

              {error && (
                <p className="text-center text-red-600 text-sm mt-4">{error}</p>
              )}

              <p className="text-center text-sm text-ink-500 mt-8">
                {t.signupHaveAccount}{" "}
                <Link href="/login" className="text-ink-900 font-medium underline underline-offset-2">
                  {t.signupLoginLink}
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
