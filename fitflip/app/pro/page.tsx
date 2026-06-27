"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readLang, writeLang, type Lang } from "@/lib/lang";
import { isNativePlatform } from "@/lib/native";
import { getPlans, purchasePro, restorePro, type IapPlanInfo } from "@/lib/iap";

type AuthState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "free" }
  | { status: "premium" };

/**
 * Public FitFlip Pro information page + subscription entry point.
 *
 * CTA behaviour:
 *   - signed-out user  → /signup?next=/pro (lands back here after signup)
 *   - signed-in free   → opens consent modal → Stripe Checkout (same flow
 *                        as the main-page paywall, just reachable earlier)
 *   - signed-in premium → /account ("Manage subscription")
 */
export default function ProPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("hu");
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  // Native in-app purchase state. `native` gates the whole IAP path; on the web
  // it stays false and the Stripe flow is used unchanged.
  const [native] = useState(() => isNativePlatform());
  const [storePlans, setStorePlans] = useState<IapPlanInfo[]>([]);
  const [restoreLoading, setRestoreLoading] = useState(false);

  useEffect(() => {
    setLang(readLang());
    // Pull store-localized prices for the native purchase buttons.
    if (isNativePlatform()) {
      getPlans()
        .then(setStorePlans)
        .catch(() => setStorePlans([]));
    }
    // Premium state comes from the server (/api/analyze GET) rather than a
    // direct client-side profiles read — the latter depends on RLS select
    // policies and could misreport a premium user as free (risking a
    // duplicate Stripe subscription from this page's CTA).
    fetch("/api/analyze")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || d.authenticated !== true) {
          setAuth({ status: "anon" });
          return;
        }
        setAuth({ status: d.isPremium ? "premium" : "free" });
      })
      .catch(() => setAuth({ status: "anon" }));
  }, []);

  const switchLang = (l: Lang) => {
    setLang(l);
    writeLang(l);
  };

  const goCta = () => {
    if (auth.status === "loading") return;
    if (auth.status === "anon") {
      router.push("/signup?next=/pro");
      return;
    }
    if (auth.status === "premium") {
      router.push("/account");
      return;
    }
    // Native app: go straight to the Apple/Google purchase sheet — the store's
    // own flow is the authoritative confirmation, so we skip the web consent
    // modal (which exists for the Stripe/EU-withdrawal path).
    if (native) {
      startNativePurchase();
      return;
    }
    // Web free user → open consent modal → Stripe Checkout.
    setConsentChecked(false);
    setCheckoutError(null);
    setConsentOpen(true);
  };

  const startNativePurchase = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const ok = await purchasePro(plan);
      if (!ok) {
        setCheckoutError(
          lang === "hu"
            ? "A vásárlás nem fejeződött be. Próbáld újra."
            : "The purchase didn't complete. Please try again."
        );
        setCheckoutLoading(false);
        return;
      }
      // Verify + flip is_premium server-side, then reflect it in the UI.
      await fetch("/api/iap/activate", { method: "POST" }).catch(() => {});
      setAuth({ status: "premium" });
      setCheckoutLoading(false);
    } catch (err) {
      const cancelled = err instanceof Error && err.message === "cancelled";
      if (!cancelled) {
        setCheckoutError(
          lang === "hu"
            ? "A vásárlás nem sikerült. Próbáld újra."
            : "Purchase failed. Please try again."
        );
      }
      setCheckoutLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoreLoading(true);
    setCheckoutError(null);
    try {
      const ok = await restorePro();
      await fetch("/api/iap/activate", { method: "POST" }).catch(() => {});
      if (ok) {
        setAuth({ status: "premium" });
      } else {
        setCheckoutError(
          lang === "hu"
            ? "Nem találtunk visszaállítható előfizetést."
            : "No purchases found to restore."
        );
      }
    } catch {
      // No active store subscription / nothing to restore (or the store
      // returned an error) — show the calm "nothing found" message rather
      // than a scary failure.
      setCheckoutError(
        lang === "hu"
          ? "Nem találtunk visszaállítható előfizetést."
          : "No purchases found to restore."
      );
    } finally {
      setRestoreLoading(false);
    }
  };

  const startCheckout = async () => {
    if (!consentChecked) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalConsent: true, plan }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setCheckoutError(
          lang === "hu"
            ? "Nem sikerült elindítani a fizetést. Próbáld újra."
            : "Could not start checkout. Please try again."
        );
        setCheckoutLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError(
        lang === "hu"
          ? "Nem sikerült elindítani a fizetést. Próbáld újra."
          : "Could not start checkout. Please try again."
      );
      setCheckoutLoading(false);
    }
  };

  const t = lang === "hu" ? HU : EN;

  // Native shows the store-localized price; web (and native before offerings
  // load) shows the canonical HUF price.
  const yearlyPrice =
    storePlans.find((p) => p.plan === "yearly")?.priceString ?? "24 990 Ft";
  const monthlyPrice =
    storePlans.find((p) => p.plan === "monthly")?.priceString ?? "2 490 Ft";

  const ctaLabel = (() => {
    switch (auth.status) {
      case "loading":
        return "…";
      case "anon":
        return t.ctaSignedOut;
      case "free":
        return t.ctaSignedIn;
      case "premium":
        return t.ctaPremium;
    }
  })();

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-50">
      <header className="flex items-center justify-between px-5 pb-2 safe-pt-4">
        <Link
          href="/"
          className="text-xs text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {t.back}
        </Link>
        <div className="flex items-center text-xs">
          <button
            type="button"
            onClick={() => switchLang("hu")}
            className={`px-2 py-1 rounded ${lang === "hu" ? "bg-ink-900 dark:bg-ink-700 text-white" : "text-ink-500 dark:text-ink-400"}`}
          >
            HU
          </button>
          <button
            type="button"
            onClick={() => switchLang("en")}
            className={`px-2 py-1 rounded ${lang === "en" ? "bg-ink-900 dark:bg-ink-700 text-white" : "text-ink-500 dark:text-ink-400"}`}
          >
            EN
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-6 pb-10">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-ink-700 dark:from-amber-600 dark:via-amber-500 dark:to-amber-400 text-white dark:text-ink-950 p-8 mb-8 text-center">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3), transparent 40%)" }} />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 dark:bg-ink-950/15 text-[10px] font-semibold uppercase tracking-widest mb-4">
              ✨ {t.heroBadge}
            </div>
            <h1 className="text-4xl sm:text-5xl font-display tracking-tight mb-3">
              FitFlip <span className="font-bold">Pro</span>
            </h1>
            <p className="text-sm sm:text-base opacity-90 leading-relaxed">
              {t.heroTagline}
            </p>
          </div>
        </div>

        {auth.status === "premium" && (
          <div className="mb-8 rounded-2xl border-2 border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-center">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              ✓ {t.alreadyPremium}
            </p>
          </div>
        )}

        {/* Comparison table */}
        <div className="mb-8 rounded-2xl border border-ink-100 dark:border-ink-700 overflow-hidden">
          <div className="grid grid-cols-3 text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 bg-ink-50 dark:bg-ink-800 border-b border-ink-100 dark:border-ink-700">
            <div className="px-4 py-3">{t.feature}</div>
            <div className="px-4 py-3 text-center">{t.free}</div>
            <div className="px-4 py-3 text-center text-amber-600 dark:text-amber-400 font-semibold">PRO</div>
          </div>
          <CompareRow label={t.cmp1} free={t.cmp1Free} pro={t.cmp1Pro} />
          <CompareRow label={t.cmp2} free="—" pro={t.cmp2Pro} />
          <CompareRow label={t.cmp3} free="✓" pro="✓" />
          <CompareRow label={t.cmp4} free="✓" pro="✓" />
          <CompareRow label={t.cmp5} free="✓" pro="✓" />
        </div>

        {/* Detailed perks */}
        <h2 className="text-2xl font-display tracking-tight mb-4">{t.perksTitle}</h2>
        <div className="space-y-3 mb-8">
          <PerkCard icon="∞" title={t.perk1Title} body={t.perk1Body} />
          <PerkCard icon="🔔" title={t.perk2Title} body={t.perk2Body} />
          <PerkCard icon="📊" title={t.perk3Title} body={t.perk3Body} />
          <PerkCard icon="🏷️" title={t.perk4Title} body={t.perk4Body} />
        </div>

        {/* CTA card — monthly/yearly plan picker */}
        <div className="rounded-3xl border-2 border-ink-900 dark:border-amber-400 p-6 mb-6">
          <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-4 text-center">
            {t.ctaCardLabel}
          </p>

          {/* Yearly */}
          <button
            type="button"
            onClick={() => setPlan("yearly")}
            className={`w-full text-left rounded-2xl border-2 p-4 mb-3 transition ${
              plan === "yearly"
                ? "border-ink-900 dark:border-amber-400 bg-ink-50 dark:bg-ink-800"
                : "border-ink-100 dark:border-ink-700 hover:border-ink-300"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{t.planYearly}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{t.planYearlySub}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-display">{yearlyPrice}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  {t.planYearlyBadge}
                </span>
              </div>
            </div>
          </button>

          {/* Monthly */}
          <button
            type="button"
            onClick={() => setPlan("monthly")}
            className={`w-full text-left rounded-2xl border-2 p-4 mb-4 transition ${
              plan === "monthly"
                ? "border-ink-900 dark:border-amber-400 bg-ink-50 dark:bg-ink-800"
                : "border-ink-100 dark:border-ink-700 hover:border-ink-300"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{t.planMonthly}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{t.planMonthlySub}</p>
              </div>
              <p className="text-xl font-display shrink-0">{monthlyPrice}</p>
            </div>
          </button>

          <p className="text-xs text-ink-500 dark:text-ink-400 mb-4 text-center">{t.ctaCardCancel}</p>
          <button
            type="button"
            onClick={goCta}
            disabled={auth.status === "loading" || checkoutLoading}
            className="w-full px-6 py-3.5 rounded-full bg-ink-900 dark:bg-amber-400 text-white dark:text-ink-950 font-medium hover:opacity-90 transition text-sm disabled:opacity-50"
          >
            {checkoutLoading ? "…" : ctaLabel}
          </button>

          {/* Native-only: purchase errors + Apple/Google-required restore. */}
          {native && checkoutError && (
            <p className="text-xs text-red-600 mt-3 text-center">{checkoutError}</p>
          )}
          {native && auth.status !== "premium" && (
            <button
              type="button"
              onClick={handleRestore}
              disabled={restoreLoading || checkoutLoading}
              className="w-full mt-3 text-xs text-ink-500 dark:text-ink-400 underline underline-offset-2 hover:text-ink-900 dark:hover:text-white disabled:opacity-50"
            >
              {restoreLoading ? "…" : t.restore}
            </button>
          )}

          {auth.status === "anon" && (
            <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-3">
              {t.ctaAlreadyAccount}{" "}
              <Link
                href="/login?next=/pro"
                className="text-ink-900 dark:text-white underline underline-offset-2"
              >
                {t.ctaLogin}
              </Link>
            </p>
          )}
        </div>

        {/* FAQ */}
        <div className="space-y-3 mb-8">
          <Faq q={t.faq1Q} a={t.faq1A} />
          <Faq q={t.faq2Q} a={t.faq2A} />
          <Faq q={t.faq3Q} a={t.faq3A} />
        </div>
      </main>

      {/* Withdrawal consent modal — copies the exact wording from the main
          page paywall flow so the legal text stays consistent. */}
      {consentOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white dark:bg-ink-950 rounded-2xl p-6 shadow-xl fade-in">
            <h3 className="text-lg font-medium mb-3">
              {lang === "hu" ? "Megerősítés a prémium előfizetés előtt" : "Confirm before upgrading"}
            </h3>
            <p className="text-sm text-ink-700 dark:text-ink-200 mb-4 leading-relaxed">
              {lang === "hu"
                ? "A prémium szolgáltatás azonnal aktiválódik a fizetés után. Ehhez a 14 napos elállási jogról szóló jogszabály alapján a hozzájárulásodat kérjük."
                : "Premium is activated immediately after payment. Under the 14-day right of withdrawal we need your explicit consent."}
            </p>
            <label className="flex items-start gap-3 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 w-4 h-4 accent-ink-900 shrink-0"
              />
              <span className="text-xs text-ink-700 dark:text-ink-200 leading-relaxed">
                {lang === "hu" ? (
                  <>
                    Hozzájárulok, hogy a teljesítés a 14 napos elállási határidő lejárta előtt
                    megkezdődjön, és tudomásul veszem, hogy ezzel a 45/2014. (II. 26.) Korm.
                    rendelet 29. § (1) bek. m) pontja alapján az elállási jogomat elveszítem,
                    amint a teljesítés megkezdődött. Elolvastam és elfogadom az{" "}
                    <Link href="/terms" target="_blank" className="underline hover:text-ink-900 dark:hover:text-white">
                      ÁSZF-et
                    </Link>{" "}
                    és az{" "}
                    <Link href="/privacy" target="_blank" className="underline hover:text-ink-900 dark:hover:text-white">
                      Adatvédelmi nyilatkozatot
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    I expressly consent to immediate performance of the service before the
                    14-day withdrawal period expires, and I acknowledge that I thereby lose
                    my right of withdrawal once performance has begun, pursuant to § 29(1)(m)
                    of Hungarian Decree 45/2014 (II. 26.). I have read and accept the{" "}
                    <Link href="/terms" target="_blank" className="underline hover:text-ink-900 dark:hover:text-white">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank" className="underline hover:text-ink-900 dark:hover:text-white">
                      Privacy Policy
                    </Link>
                    .
                  </>
                )}
              </span>
            </label>
            {checkoutError && (
              <p className="text-xs text-red-600 mb-3">{checkoutError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConsentOpen(false)}
                disabled={checkoutLoading}
                className="px-4 py-2 rounded-full border border-ink-200 dark:border-ink-700 text-sm hover:bg-ink-50 dark:hover:bg-ink-800 transition disabled:opacity-50"
              >
                {lang === "hu" ? "Mégse" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={startCheckout}
                disabled={!consentChecked || checkoutLoading}
                className="px-4 py-2 rounded-full bg-ink-900 dark:bg-ink-700 text-white text-sm font-medium hover:bg-ink-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {checkoutLoading
                  ? "…"
                  : lang === "hu"
                    ? "Folytatás a fizetéshez"
                    : "Continue to payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, free, pro }: { label: string; free: string; pro: string }) {
  return (
    <div className="grid grid-cols-3 text-sm border-b border-ink-100 dark:border-ink-800 last:border-b-0">
      <div className="px-4 py-3 text-ink-700 dark:text-ink-200">{label}</div>
      <div className="px-4 py-3 text-center text-ink-500 dark:text-ink-400">{free}</div>
      <div className="px-4 py-3 text-center font-semibold">{pro}</div>
    </div>
  );
}

function PerkCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-950">
      <div className="shrink-0 w-11 h-11 rounded-xl bg-ink-900 dark:bg-amber-400 text-white dark:text-ink-950 flex items-center justify-center text-xl">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm mb-0.5">{title}</p>
        <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-2xl border border-ink-100 dark:border-ink-700 overflow-hidden bg-white dark:bg-ink-950 group">
      <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between gap-3 hover:bg-ink-50 dark:hover:bg-ink-800 transition">
        <span className="text-sm font-medium">{q}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-ink-500 dark:text-ink-400 transition-transform group-open:rotate-180">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <div className="px-4 pb-4 pt-1 text-xs text-ink-600 dark:text-ink-300 leading-relaxed">{a}</div>
    </details>
  );
}

/* -------------------------------------------------------------------------- */
/* Copy                                                                       */
/* -------------------------------------------------------------------------- */

type Strings = typeof HU;

const HU = {
  back: "Vissza",
  heroBadge: "Több, mint csak scan",
  heroTagline:
    "Korlátlan azonosítás, árfigyelők és mélyebb elemzések — komoly kereskedőknek és gyűjtőknek.",

  alreadyPremium: "Aktív FitFlip Pro előfizetésed van",

  feature: "Funkció",
  free: "Ingyenes",
  cmp1: "Napi scan",
  cmp1Free: "3",
  cmp1Pro: "Korlátlan",
  cmp2: "Árfigyelők",
  cmp2Pro: "5 darab",
  cmp3: "Élő piaci hirdetések",
  cmp4: "Történet és kor",
  cmp5: "Hype-pontszám",

  perksTitle: "Mit kapsz a Pro-val?",
  perk1Title: "Korlátlan azonosítás",
  perk1Body:
    "Annyit fotózol, amennyit csak akarsz. Hasznos, ha sokat vásárolsz, vagy egész kollekciókat akarsz katalogizálni.",
  perk2Title: "Árfigyelők (5 db)",
  perk2Body:
    "Állíts be ár-küszöböt egy darabra, és értesítünk amint olcsóbb hirdetés bukkan fel a piacon. Naponta egyszer fut.",
  perk3Title: "Részletes elemzés",
  perk3Body:
    "Hype-pontszám, kor, darab-történet, eladási tipp és állapot-alapú árdiszkont — mindezt minden scannál.",
  perk4Title: "Jobb eladási árak",
  perk4Body:
    "Az árfigyelő segít beszerzéskor; a hype-pontszám és a sztori segít eladáskor a leírást megírni. Több ezer Ft különbség.",

  ctaCardLabel: "FitFlip Pro előfizetés",
  planYearly: "Éves",
  planYearlySub: "Csak 2 083 Ft / hónap",
  planYearlyBadge: "−16% · ~2 hónap ingyen",
  planMonthly: "Havi",
  planMonthlySub: "A legrugalmasabb",
  ctaCardCancel: "Bármikor lemondható, automatikus megújulás.",
  ctaSignedIn: "Előfizetek most",
  ctaSignedOut: "Regisztrálok és előfizetek",
  ctaPremium: "Előfizetés kezelése",
  ctaAlreadyAccount: "Már van fiókod?",
  ctaLogin: "Bejelentkezés",
  restore: "Korábbi vásárlás visszaállítása",

  faq1Q: "Mikor lép életbe a Pro?",
  faq1A:
    "Azonnal a sikeres fizetés után. Az árfigyelőket és a korlátlan scan-t rögtön használhatod.",
  faq2Q: "Hogyan mondhatom le?",
  faq2A:
    "A profilodban egy kattintással. A lemondás végén az aktuális fizetési ciklus végéig használhatod a Pro-t.",
  faq3Q: "Magyar számlát kapok?",
  faq3A:
    "Igen — a fizetést követően automatikusan kiállítjuk és e-mailben elküldjük a számlát a Stripe-on keresztül.",
};

const EN: Strings = {
  back: "Back",
  heroBadge: "More than just scanning",
  heroTagline:
    "Unlimited identification, price watchers and deeper analysis — for serious sellers and collectors.",

  alreadyPremium: "You have an active FitFlip Pro subscription",

  feature: "Feature",
  free: "Free",
  cmp1: "Daily scans",
  cmp1Free: "3",
  cmp1Pro: "Unlimited",
  cmp2: "Price watchers",
  cmp2Pro: "5 items",
  cmp3: "Live marketplace listings",
  cmp4: "Story & era",
  cmp5: "Hype score",

  perksTitle: "What you get with Pro",
  perk1Title: "Unlimited identification",
  perk1Body:
    "Snap as much as you want. Useful if you buy a lot or want to catalog entire collections.",
  perk2Title: "Price watchers (5)",
  perk2Body:
    "Set a price threshold for an item, and we'll notify you when a cheaper listing shows up. Runs once a day.",
  perk3Title: "Detailed analysis",
  perk3Body:
    "Hype score, era, piece story, selling tip and condition-based discount — all included with every scan.",
  perk4Title: "Better sale prices",
  perk4Body:
    "Watchers help when buying; the hype score and story help you write better descriptions when selling. Thousands of HUF in difference.",

  ctaCardLabel: "FitFlip Pro subscription",
  planYearly: "Yearly",
  planYearlySub: "Just 2,083 HUF / month",
  planYearlyBadge: "−16% · ~2 months free",
  planMonthly: "Monthly",
  planMonthlySub: "Most flexible",
  ctaCardCancel: "Cancel anytime, auto-renewal.",
  ctaSignedIn: "Subscribe now",
  ctaSignedOut: "Sign up and subscribe",
  ctaPremium: "Manage subscription",
  ctaAlreadyAccount: "Already have an account?",
  ctaLogin: "Sign in",
  restore: "Restore previous purchase",

  faq1Q: "When does Pro activate?",
  faq1A:
    "Immediately after successful payment. You can use watchers and unlimited scans right away.",
  faq2Q: "How do I cancel?",
  faq2A:
    "One click from your profile. You keep Pro access until the end of your current billing cycle.",
  faq3Q: "Will I get a Hungarian invoice?",
  faq3A:
    "Yes — after payment we automatically issue and email the invoice through Stripe.",
};
