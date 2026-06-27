"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { translations, type Lang } from "@/lib/translations";
import { signInWithApple } from "@/lib/appleSignIn";
import { isNativePlatform, nativePlatform } from "@/lib/native";
import { biometricAvailable, hasBiometricCredentials, saveBiometricCredentials, biometricLogin } from "@/lib/biometric";
import LegalFooter from "@/components/LegalFooter";

// Only allow same-origin relative paths to avoid open-redirect.
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

// Suspense wrapper required because useSearchParams forces client-side
// rendering — without it Next.js fails the prerender at build time.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams?.get("next") ?? null);
  const [lang, setLang] = useState<Lang>("hu");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Apple Sign In is shown only inside the native iOS app (where it's required
  // by App Store guideline 4.8 and the native sheet is available). Set after
  // mount to avoid a hydration mismatch.
  const [native, setNative] = useState(false);
  // Whether to offer Face ID / Touch ID re-login (native + biometric available
  // + previously stored credentials).
  const [bioReady, setBioReady] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    setNative(nativePlatform() === "ios");
    const stored = (localStorage.getItem("ff-lang") ?? localStorage.getItem("ff_lang"));
    if (stored === "hu" || stored === "en") setLang(stored);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(next);
    });
    Promise.all([biometricAvailable(), hasBiometricCredentials()]).then(
      ([avail, has]) => setBioReady(avail && has)
    );
  }, [router, supabase, next]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      console.error("[login] error:", error);
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
        setError(t.loginInvalidCredentials);
      } else if (msg.includes("email not confirmed") || msg.includes("not_confirmed")) {
        setError(t.loginEmailNotConfirmed);
      } else {
        setError(`${t.loginError} (${error.message})`);
      }
      return;
    }
    // Stash credentials so the user can unlock with Face ID next time.
    await saveBiometricCredentials(email, password);
    router.replace(next);
  };

  const handleBiometric = async () => {
    setError(null);
    const creds = await biometricLogin(
      lang === "hu" ? "Bejelentkezés a FitFlipbe" : "Sign in to FitFlip"
    );
    if (!creds) return; // cancelled / failed
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(creds);
    setLoading(false);
    if (error) {
      // Stored password no longer valid (e.g. changed) — fall back to manual.
      setBioReady(false);
      setError(t.loginInvalidCredentials);
      return;
    }
    router.replace(next);
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setError(t.loginError);
  };

  const handleApple = async () => {
    setError(null);
    const { ok, error } = await signInWithApple(supabase, next);
    if (!ok) {
      if (error !== "cancelled") setError(t.loginError);
      return;
    }
    // Native completes in-place (token exchange); web redirects away on its own.
    if (isNativePlatform()) router.replace(next);
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
            {t.login}
          </h1>
          <p className="text-ink-500 dark:text-ink-400 text-sm text-center mb-8">
            {t.loginRequiredSub}
          </p>

          {bioReady && (
            <button
              onClick={handleBiometric}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-full bg-ink-900 text-white dark:bg-white dark:text-ink-900 hover:opacity-90 transition text-sm font-medium mb-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 8V6a4 4 0 0 1 4-4h2" />
                <path d="M22 8V6a4 4 0 0 0-4-4h-2" />
                <path d="M2 16v2a4 4 0 0 0 4 4h2" />
                <path d="M22 16v2a4 4 0 0 1-4 4h-2" />
                <path d="M9 9.5a1 1 0 0 1 2 0V11" />
                <path d="M13 9.5a1 1 0 0 1 2 0v3" />
                <path d="M9 13c0 1.5.5 3 3 3s3-1.5 3-3" />
              </svg>
              {t.loginWithBiometric}
            </button>
          )}

          {native && (
            <button
              onClick={handleApple}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full bg-ink-900 text-white dark:bg-white dark:text-ink-900 hover:opacity-90 transition text-sm font-medium mb-3"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.78 1.3 10.32.86 1.24 1.89 2.64 3.23 2.59 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.27 3.13-2.52.99-1.44 1.4-2.84 1.42-2.91-.03-.01-2.72-1.04-2.75-4.13M14.53 4.5c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44"/>
              </svg>
              {t.loginWithApple}
            </button>
          )}

          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-full border border-ink-100 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-800 transition text-sm font-medium"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t.loginWithGoogle}
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-ink-100" />
            <span className="text-xs text-ink-500 dark:text-ink-400 uppercase tracking-wider">{t.loginOr}</span>
            <div className="flex-1 h-px bg-ink-100" />
          </div>

          <form onSubmit={handleSignIn} className="space-y-3">
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
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium">
                  {t.loginPasswordLabel}
                </label>
                <Link href="/forgot-password" className="text-xs text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white underline underline-offset-2">
                  {t.loginForgotPassword}
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.loginPasswordPlaceholder}
                className="w-full px-4 py-2.5 rounded-xl border border-ink-100 dark:border-ink-700 focus:border-ink-900 focus:outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full px-6 py-3 rounded-full bg-ink-900 text-white font-medium hover:bg-ink-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "…" : t.loginSubmit}
            </button>
          </form>

          {error && (
            <p className="text-center text-red-600 text-sm mt-4">{error}</p>
          )}

          <p className="text-center text-sm text-ink-500 dark:text-ink-400 mt-8">
            {t.loginNoAccount}{" "}
            <Link href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-ink-900 dark:text-ink-50 font-medium underline underline-offset-2">
              {t.loginSignupLink}
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
