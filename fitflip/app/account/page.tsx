"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { readLang } from "@/lib/lang";
import LegalFooter from "@/components/LegalFooter";
import ThemeToggle from "@/components/ThemeToggle";

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const [lang, setLang] = useState<"hu" | "en">("hu");
  const [email, setEmail] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setLang(readLang());
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);
    });
  }, [router, supabase]);

  const t =
    lang === "hu"
      ? {
          title: "Fiók",
          back: "← Vissza",
          emailLabel: "Bejelentkezve mint",
          dangerTitle: "Fiók törlése",
          dangerDesc:
            "A fiókod, az összes scan-előzményed és a feltöltött képeid véglegesen törlésre kerülnek. A Stripe-on keresztüli előfizetésedet lemondjuk; az App Store / Google Play előfizetést a fiók törlése NEM szünteti meg — azt a készülék előfizetés-beállításaiban külön kell lemondanod. Számviteli bizonylatokat a jogszabályi megőrzési ideig (8 év) megőrizzük.",
          deleteCta: "Fiók törlése…",
          confirmTitle: "Biztos, hogy törlöd a fiókodat?",
          confirmSub:
            "Ez a művelet nem visszavonható. A megerősítéshez írd be lent a saját email címedet.",
          confirmPlaceholder: "your@email.com",
          confirmDelete: "Véglegesen törlöm",
          cancel: "Mégse",
          mismatchError: "A beírt email nem egyezik a fiókoddal.",
          unknownError: "Hiba történt. Próbáld újra később.",
        }
      : {
          title: "Account",
          back: "← Back",
          emailLabel: "Signed in as",
          dangerTitle: "Delete account",
          dangerDesc:
            "Your account, all scan history and uploaded photos will be permanently deleted. Any subscription purchased via Stripe will be cancelled; App Store / Google Play subscriptions are NOT cancelled by deleting your account — you must cancel those separately in your device's subscription settings. Accounting records will be retained for the statutory period (8 years).",
          deleteCta: "Delete account…",
          confirmTitle: "Are you sure you want to delete your account?",
          confirmSub: "This cannot be undone. To confirm, type your account email below.",
          confirmPlaceholder: "your@email.com",
          confirmDelete: "Delete permanently",
          cancel: "Cancel",
          mismatchError: "The email you typed doesn't match your account.",
          unknownError: "Something went wrong. Please try again later.",
        };

  const submitDelete = async () => {
    if (!email) return;
    if (confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
      setError(t.mismatchError);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setError(data.error === "email_mismatch" ? t.mismatchError : t.unknownError);
        setDeleting(false);
        return;
      }
      // Sign out client-side and redirect home.
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setError(t.unknownError);
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-dvh flex flex-col bg-white dark:bg-ink-950">
      <header className="px-6 pb-5 safe-pt-5 flex items-center justify-between border-b border-ink-100 dark:border-ink-700">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-display tracking-tight">FitFlip</span>
          <span className="text-xs text-ink-500 dark:text-ink-400 hidden sm:inline">.app</span>
        </Link>
        <Link href="/" className="text-sm text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition">
          {t.back}
        </Link>
      </header>

      <section className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-display tracking-tight mb-8">{t.title}</h1>

        {email && (
          <div className="mb-8 p-4 rounded-2xl bg-ink-50 dark:bg-ink-800 border border-ink-100 dark:border-ink-700">
            <p className="text-xs text-ink-500 dark:text-ink-400 uppercase tracking-wider mb-1">{t.emailLabel}</p>
            <p className="text-sm font-medium">{email}</p>
          </div>
        )}

        <div className="mb-8">
          <ThemeToggle lang={lang} />
        </div>

        <div className="border border-red-200 dark:border-red-900/60 rounded-2xl p-5 bg-red-50 dark:bg-red-950/40">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">{t.dangerTitle}</h2>
          <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed mb-4">{t.dangerDesc}</p>
          {!showConfirm ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 rounded-full border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition"
            >
              {t.deleteCta}
            </button>
          ) : (
            <div className="border-t border-red-200 dark:border-red-900/60 pt-4">
              <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">{t.confirmTitle}</p>
              <p className="text-xs text-red-700 dark:text-red-300 mb-3">{t.confirmSub}</p>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={t.confirmPlaceholder}
                disabled={deleting}
                className="w-full px-3 py-2 mb-3 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-ink-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:opacity-50"
              />
              {error && <p className="text-xs text-red-700 dark:text-red-300 mb-3">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submitDelete}
                  disabled={deleting || !confirmEmail.trim()}
                  className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? "…" : t.confirmDelete}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmEmail("");
                    setError(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 rounded-full border border-ink-200 dark:border-ink-700 text-sm hover:bg-ink-50 dark:hover:bg-ink-800 transition disabled:opacity-50"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="px-6 py-6 border-t border-ink-100 dark:border-ink-700 space-y-2">
        <p className="text-center text-[10px] text-ink-400 dark:text-ink-500 font-mono">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </p>
        <LegalFooter />
      </footer>
    </main>
  );
}
