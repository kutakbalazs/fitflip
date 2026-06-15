"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readLang, writeLang, type Lang } from "@/lib/lang";
import { demoScanHU, demoScanEN, type DemoScanResult } from "@/lib/onboarding/demoScan";
import type { Listing } from "@/lib/listings/types";
import StoryModal from "@/components/StoryModal";

const STORAGE_KEY = "ff-onboarded";
const TOTAL_SLIDES = 4;

export default function WelcomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("hu");
  const [step, setStep] = useState(0); // 0..3

  useEffect(() => {
    setLang(readLang());
  }, []);

  const switchLang = (l: Lang) => {
    setLang(l);
    writeLang(l);
  };

  const finish = (destination: "scan" | "signup" = "scan") => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    router.push(destination === "signup" ? "/signup" : "/");
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_SLIDES - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const t = lang === "hu" ? HU : EN;

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-50 flex flex-col">
      {/* Top bar: language + skip */}
      <header className="flex items-center justify-between px-5 pb-2 safe-pt-4 shrink-0">
        <div className="flex items-center text-xs">
          <button
            type="button"
            onClick={() => switchLang("hu")}
            className={`px-2 py-1 rounded ${lang === "hu" ? "bg-ink-900 text-white" : "text-ink-500 dark:text-ink-400"}`}
          >
            HU
          </button>
          <button
            type="button"
            onClick={() => switchLang("en")}
            className={`px-2 py-1 rounded ${lang === "en" ? "bg-ink-900 text-white" : "text-ink-500 dark:text-ink-400"}`}
          >
            EN
          </button>
        </div>
        <button
          type="button"
          onClick={() => finish("scan")}
          className="text-xs text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white px-3 py-1.5"
        >
          {t.skip}
        </button>
      </header>

      {/* Progress bar */}
      <div className="px-5 pt-1 pb-3 shrink-0">
        <div className="h-1 w-full rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
          <div
            className="h-full bg-ink-900 dark:bg-white transition-all duration-300 ease-out"
            style={{ width: `${((step + 1) / TOTAL_SLIDES) * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-ink-400 mt-1.5 text-right tabular-nums">
          {step + 1} / {TOTAL_SLIDES}
        </p>
      </div>

      {/* Slide content */}
      <main className="flex-1 overflow-y-auto px-5 pb-3">
        {step === 0 && <SlideWelcome t={t} />}
        {step === 1 && <SlideFeatures t={t} />}
        {step === 2 && <SlideDemo t={t} lang={lang} />}
        {step === 3 && <SlidePro t={t} />}
      </main>

      {/* Footer nav */}
      <footer className="shrink-0 px-5 pt-3 pb-5 border-t border-ink-100 dark:border-ink-800 flex items-center gap-3 bg-white dark:bg-ink-950">
        <button
          type="button"
          onClick={prev}
          disabled={step === 0}
          className="px-4 py-3 rounded-full text-sm font-medium text-ink-700 dark:text-ink-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink-50 dark:hover:bg-ink-800 transition"
        >
          {t.back}
        </button>
        <div className="flex-1" />
        {step < TOTAL_SLIDES - 1 ? (
          <button
            type="button"
            onClick={next}
            className="px-6 py-3 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-medium hover:opacity-90 transition text-sm flex items-center gap-2"
          >
            {t.next}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => finish("scan")}
            className="px-6 py-3 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-medium hover:opacity-90 transition text-sm"
          >
            {t.start}
          </button>
        )}
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Slides                                                                     */
/* -------------------------------------------------------------------------- */

function SlideWelcome({ t }: { t: Strings }) {
  return (
    <div className="max-w-md mx-auto fade-in pt-2">
      <h1 className="text-3xl sm:text-4xl font-display tracking-tight mb-3">
        {t.welcomeTitle}
      </h1>
      <p className="text-base text-ink-600 dark:text-ink-300 leading-relaxed mb-6">
        {t.welcomeBody}
      </p>
      <div className="rounded-3xl overflow-hidden bg-ink-50 dark:bg-ink-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/onboarding-hero.jpg"
          alt=""
          className="w-full h-auto block"
          loading="eager"
        />
      </div>
    </div>
  );
}

function SlideFeatures({ t }: { t: Strings }) {
  return (
    <div className="max-w-md mx-auto fade-in pt-2">
      <h2 className="text-2xl sm:text-3xl font-display tracking-tight mb-1">
        {t.featuresTitle}
      </h2>
      <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">
        {t.featuresSubtitle}
      </p>
      <div className="space-y-4">
        <Feature icon={<CameraIcon />} title={t.f1Title} body={t.f1Body} />
        <Feature icon={<PriceIcon />} title={t.f2Title} body={t.f2Body} />
        <Feature icon={<MarketIcon />} title={t.f3Title} body={t.f3Body} />
        <Feature icon={<BellIcon />} title={t.f4Title} body={t.f4Body} />
      </div>
    </div>
  );
}

function SlideDemo({ t, lang }: { t: Strings; lang: Lang }) {
  const [started, setStarted] = useState(false);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loadingListings, setLoadingListings] = useState(false);

  const demo: DemoScanResult = lang === "hu" ? demoScanHU : demoScanEN;

  const startDemo = async () => {
    setStarted(true);
    setLoadingListings(true);
    try {
      const res = await fetch("/api/onboarding/demo-listings", { cache: "no-store" });
      const data = await res.json();
      setListings(Array.isArray(data?.listings) ? data.listings : []);
    } catch {
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  };

  if (!started) {
    return (
      <div className="max-w-md mx-auto fade-in pt-2">
        <h2 className="text-2xl sm:text-3xl font-display tracking-tight mb-1">
          {t.demoTitle}
        </h2>
        <p className="text-sm text-ink-500 dark:text-ink-400 mb-5">
          {t.demoSubtitle}
        </p>
        <div className="rounded-3xl overflow-hidden bg-ink-50 dark:bg-ink-800 mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Onboarding-pic1.avif"
            alt=""
            className="w-full h-auto block"
            loading="eager"
          />
        </div>
        <button
          type="button"
          onClick={startDemo}
          className="w-full px-5 py-3.5 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-medium hover:opacity-90 transition text-sm"
        >
          {t.demoTryThis}
        </button>
        <p className="text-center text-[11px] text-ink-400 mt-2.5">{t.demoNoLimit}</p>
      </div>
    );
  }

  return <DemoResult t={t} lang={lang} demo={demo} listings={listings} loading={loadingListings} />;
}

/**
 * Mirrors the real scan result layout (see app/page.tsx around L1399) so the
 * demo feels exactly like what users get after a real scan.
 */
function DemoResult({
  t,
  lang,
  demo,
  listings,
  loading,
}: {
  t: Strings;
  lang: Lang;
  demo: DemoScanResult;
  listings: Listing[] | null;
  loading: boolean;
}) {
  const [showStory, setShowStory] = useState(false);
  return (
    <div className="w-full max-w-md mx-auto fade-in">
      {/* Demo banner so users know this is a sample, not a real scan */}
      <div className="mb-3 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold uppercase tracking-wider w-fit mx-auto">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {t.demoBadge}
      </div>

      {/* Image with hype badge */}
      <div className="relative aspect-square w-full max-w-xs mx-auto rounded-2xl overflow-hidden bg-ink-50 dark:bg-ink-800 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Onboarding-pic1.avif"
          alt=""
          className="w-full h-full object-contain"
        />
        <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm backdrop-blur-sm bg-ink-900 text-white">
          <span className="mr-1">🔥</span>
          {demo.hypeLabel}
        </div>
      </div>

      {/* Main result card — matches the real scan layout 1:1 */}
      <div className="border border-ink-100 dark:border-ink-700 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-ink-100 dark:border-ink-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium">
                {demo.brand} <span className="text-ink-500 dark:text-ink-400">— {demo.model}</span>
              </h2>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">{demo.era}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-800">
              {lang === "hu" ? "Magas biztonsággal" : "High confidence"}
            </span>
          </div>
        </div>

        <dl className="divide-y divide-ink-100 dark:divide-ink-800">
          <div className="flex justify-between px-6 py-3 text-sm">
            <dt className="text-ink-500 dark:text-ink-400">
              {lang === "hu" ? "Állapot" : "Condition"}
            </dt>
            <dd className="font-medium">{demo.condition}</dd>
          </div>
          <div className="flex justify-between px-6 py-3 text-sm">
            <dt className="text-ink-500 dark:text-ink-400">
              {lang === "hu" ? "Piaci ársáv" : "Market range"}
            </dt>
            <dd className="font-medium text-right">
              <div>
                {fmtHuf(demo.estimateMinHuf)} – {fmtHuf(demo.estimateMaxHuf)}
              </div>
              <div className="text-[11px] font-normal text-ink-500 dark:text-ink-400 mt-0.5">
                {lang === "hu"
                  ? `Élő hirdetések alapján (${listings?.length ?? "…"} találat)`
                  : `Based on live listings (${listings?.length ?? "…"} found)`}
              </div>
            </dd>
          </div>
        </dl>

        <div className="px-6 py-4 bg-ink-50 dark:bg-ink-800 text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
          {demo.description}
        </div>

        {/* Story button — same look as the real scan */}
        <button
          type="button"
          onClick={() => setShowStory(true)}
          className="w-full flex items-center justify-between gap-3 px-6 py-3.5 border-t border-ink-100 dark:border-ink-700 text-left hover:bg-ink-50 dark:hover:bg-ink-800 transition group"
        >
          <span className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-ink-900 text-white text-sm flex items-center justify-center" aria-hidden="true">
              ★
            </span>
            <span className="text-sm font-medium">
              {lang === "hu" ? "A darab története" : "The story of this piece"}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-500 dark:text-ink-400 group-hover:text-ink-900 dark:group-hover:text-white transition" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <StoryModal
        open={showStory}
        onClose={() => setShowStory(false)}
        title={`${demo.brand} — ${demo.model}`}
        story={demo.story}
        lang={lang}
      />

      {/* Listings section — also matches real scan */}
      <div className="mt-6">
        <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-3">
          {lang === "hu" ? "Hirdetések a piacról" : "Listings on the marketplace"}
        </p>
        {loading ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="border border-ink-100 dark:border-ink-700 rounded-2xl overflow-hidden bg-white dark:bg-ink-950">
                <div className="flex gap-3 p-3">
                  <div className="w-20 h-20 rounded-lg bg-ink-100 dark:bg-ink-800 shrink-0 pulse-slow" />
                  <div className="flex-1 min-w-0 space-y-2 py-1">
                    <div className="h-3 w-4/5 rounded bg-ink-100 dark:bg-ink-800 pulse-slow" />
                    <div className="h-3 w-2/5 rounded bg-ink-100 dark:bg-ink-800 pulse-slow" />
                    <div className="h-2.5 w-3/5 rounded bg-ink-100 dark:bg-ink-800 pulse-slow" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : listings && listings.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {listings.map((l, idx) => (
              <li key={`${l.source}-${idx}`} className="border border-ink-100 dark:border-ink-700 rounded-2xl overflow-hidden bg-white dark:bg-ink-950 hover:border-ink-300 transition">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-3">
                  {l.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={l.imageUrl}
                      alt={l.title}
                      loading="lazy"
                      className="w-20 h-20 rounded-lg object-cover bg-ink-50 dark:bg-ink-800 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-ink-50 dark:bg-ink-800 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{l.title}</p>
                    <p className="text-sm text-ink-900 dark:text-ink-50 mt-1">{l.priceLabel}</p>
                    <p className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-ink-400 mt-1">
                      {l.source === "vinted"
                        ? "Vinted"
                        : l.source === "jofogas"
                        ? "Jófogás"
                        : l.source === "ebay"
                        ? "eBay"
                        : (l.source as string)}
                      {l.location ? ` · ${l.location}` : ""}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border border-ink-100 dark:border-ink-700 rounded-2xl p-6 bg-ink-50 dark:bg-ink-800 text-center text-sm text-ink-500 dark:text-ink-400">
            {t.demoNoListings}
          </div>
        )}
      </div>

      {/* Selling tip */}
      <div className="mt-4 border border-ink-100 dark:border-ink-700 rounded-2xl p-6 bg-ink-50 dark:bg-ink-800">
        <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-2">
          {lang === "hu" ? "Eladási tipp" : "Selling tip"}
        </p>
        <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
          {demo.sellingTip}
        </p>
      </div>
    </div>
  );
}

function SlidePro({ t }: { t: Strings }) {
  return (
    <div className="max-w-md mx-auto fade-in pt-2 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl">
        ✨
      </div>
      <h2 className="text-2xl sm:text-3xl font-display tracking-tight mb-2">
        {t.proTitle}
      </h2>
      <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">{t.proSubtitle}</p>

      <ul className="text-left space-y-3 mb-6">
        <ProPerk title={t.perk1Title} body={t.perk1Body} />
        <ProPerk title={t.perk2Title} body={t.perk2Body} />
        <ProPerk title={t.perk3Title} body={t.perk3Body} />
      </ul>

      <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">{t.proFooter}</p>
      <Link
        href="/pro"
        className="text-xs text-ink-700 dark:text-ink-300 underline underline-offset-2"
      >
        {t.proLearnMore}
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small pieces                                                               */
/* -------------------------------------------------------------------------- */

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-10 h-10 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 pt-1">
        <p className="text-sm font-medium leading-tight mb-1">{title}</p>
        <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function ProPerk({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed mt-0.5">{body}</p>
      </div>
    </li>
  );
}

function fmtHuf(n: number): string {
  return `${n.toLocaleString("hu-HU").replace(/,/g, " ")} Ft`;
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function PriceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function MarketIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Copy                                                                       */
/* -------------------------------------------------------------------------- */

type Strings = typeof HU;

const HU = {
  skip: "Kihagyom",
  back: "Vissza",
  next: "Tovább",
  start: "Kezdjük",

  welcomeTitle: "Üdv a FitFlip-en",
  welcomeBody:
    "Fotózd, ismerd meg, és add el a ruháidat. A FitFlip megmondja, mit ér a darabod a magyar piacon.",

  featuresTitle: "Mit tud a FitFlip?",
  featuresSubtitle: "Néhány másodperc alatt megtudsz mindent a darabodról.",
  f1Title: "Márka és modell felismerés",
  f1Body: "Csak fotózd le. Sneaker, vintage póló, designer darab — felismeri.",
  f2Title: "Reális használtpiaci ár",
  f2Body: "Pontos ársáv a darab állapotának és hype-jának figyelembevételével.",
  f3Title: "Élő hirdetések a piacról",
  f3Body: "Megmutatjuk hol és mennyiért árulják éppen ugyanezt.",
  f4Title: "Árfigyelő",
  f4Body: "Szólunk, ha olcsóbban felbukkan a kiszemelt darabod.",

  demoTitle: "Próbáld ki most",
  demoSubtitle: "Nézzük meg élesben — egy igazi darabbal.",
  demoTryThis: "Próbáld ki ezzel a képpel",
  demoNoLimit: "Nem számít bele a napi keresési kereteidbe.",
  demoBadge: "Demó",
  demoEstimate: "Becsült ár",
  demoLiveListings: "Élő hirdetések most",
  demoNoListings: "Most épp nincs aktív hirdetés ehhez a darabhoz.",

  proTitle: "FitFlip Pro",
  proSubtitle: "Aktív kereskedőknek és gyűjtőknek.",
  perk1Title: "Korlátlan scan",
  perk1Body: "Annyit fotózol, amennyit csak akarsz.",
  perk2Title: "Árfigyelők",
  perk2Body: "Akár 5 darabot is követhetsz — szólunk amint olcsóbban felbukkan.",
  perk3Title: "Részletes elemzés",
  perk3Body: "Sztori, kor, hype-pontszám és eladási tipp minden darabhoz.",
  proFooter:
    "Az ingyenes verzió is mindent tud — később bármikor előfizethetsz a profilodban.",
  proLearnMore: "Pro részletek megtekintése",
};

const EN: Strings = {
  skip: "Skip",
  back: "Back",
  next: "Next",
  start: "Let's go",

  welcomeTitle: "Welcome to FitFlip",
  welcomeBody:
    "Snap, identify, and sell your clothing. FitFlip tells you what your piece is worth on the Hungarian market.",

  featuresTitle: "What does FitFlip do?",
  featuresSubtitle: "Find out everything about your piece in seconds.",
  f1Title: "Brand & model recognition",
  f1Body: "Just snap a photo. Sneakers, vintage tees, designer pieces — we identify it.",
  f2Title: "Realistic resale price",
  f2Body: "Accurate price range factoring in condition and hype.",
  f3Title: "Live listings from the market",
  f3Body: "We show you where and for how much the same piece is selling right now.",
  f4Title: "Price watcher",
  f4Body: "We notify you when your wishlist piece pops up cheaper.",

  demoTitle: "Try it now",
  demoSubtitle: "Let's see it live — with a real piece.",
  demoTryThis: "Try with this image",
  demoNoLimit: "Doesn't count toward your daily scan quota.",
  demoBadge: "Demo",
  demoEstimate: "Estimated value",
  demoLiveListings: "Live listings right now",
  demoNoListings: "No active listings for this piece at the moment.",

  proTitle: "FitFlip Pro",
  proSubtitle: "For active sellers and collectors.",
  perk1Title: "Unlimited scans",
  perk1Body: "Snap as much as you want.",
  perk2Title: "Price watchers",
  perk2Body: "Track up to 5 pieces — we'll notify you when they pop up cheaper.",
  perk3Title: "Detailed analysis",
  perk3Body: "Story, era, hype score, and selling tip for every piece.",
  proFooter:
    "The free tier does everything too — you can subscribe anytime from your profile.",
  proLearnMore: "View Pro details",
};
