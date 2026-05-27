"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  lang: "hu" | "en";
  authenticated?: boolean;
};

export default function OnboardingModal({
  open,
  onClose,
  lang: initialLang,
  authenticated = false,
}: Props) {
  const [lang, setLang] = useState<"hu" | "en">(initialLang);
  const router = useRouter();

  if (!open) return null;

  const switchLang = (l: "hu" | "en") => {
    setLang(l);
    try {
      localStorage.setItem("ff_lang", l);
      localStorage.setItem("ff-lang", l);
    } catch {
      /* ignore */
    }
  };

  const handleClose = () => {
    try {
      localStorage.setItem("ff-onboarded", "1");
    } catch {
      /* ignore */
    }
    onClose();
  };

  const handleCta = () => {
    handleClose();
    if (!authenticated) {
      router.push("/signup");
    }
  };

  const t =
    lang === "hu"
      ? {
          close: "Bezárás",
          title: "Üdv a FitFlip-ben",
          subtitle: "Fotózd. Azonosítsd. Add el.",
          calloutTitle: "Mit lehet scanelni",
          calloutBody:
            "Sneakerek, vintage ruhák, streetwear, designer darabok. Modern sorozatokra a legpontosabb.",
          tip1Title: "Fotózz egy tiszta képet",
          tip1: "Egyenes szög, jó fény, lehetőleg fehér háttér.",
          tip2Title: "Az AI azonosít és árbecsül",
          tip2: "Márka, modell, állapot, magyar piaci ár.",
          tip3Title: "Add meg a méretet",
          tip3: "Pontosabb árbecslés és méret-matched hirdetések.",
          ctaSignup: "Próbáld ki most",
          ctaLoggedIn: "Kezdjük",
          haveAccount: "Már van fiókod?",
          signin: "Bejelentkezés",
        }
      : {
          close: "Close",
          title: "Welcome to FitFlip",
          subtitle: "Snap. Identify. Sell.",
          calloutTitle: "What you can scan",
          calloutBody:
            "Sneakers, vintage clothing, streetwear, designer pieces. Most accurate on modern releases.",
          tip1Title: "Snap a clean shot",
          tip1: "Straight angle, good light, ideally white background.",
          tip2Title: "AI identifies and prices",
          tip2: "Brand, model, condition, Hungarian market value.",
          tip3Title: "Add the size",
          tip3: "Tighter price band and size-matched listings.",
          ctaSignup: "Try it now",
          ctaLoggedIn: "Let's go",
          haveAccount: "Already have an account?",
          signin: "Sign in",
        };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95dvh] overflow-y-auto fade-in">
        {/* Header: lang toggle + close */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center text-xs">
            <button
              type="button"
              onClick={() => switchLang("hu")}
              className={`px-2 py-1 rounded ${lang === "hu" ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900"}`}
            >
              HU
            </button>
            <button
              type="button"
              onClick={() => switchLang("en")}
              className={`px-2 py-1 rounded ${lang === "en" ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900"}`}
            >
              EN
            </button>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t.close}
            className="w-8 h-8 rounded-full hover:bg-ink-50 text-ink-500 hover:text-ink-900 flex items-center justify-center transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-7">
          {/* Hero: clothing items inside a scan frame */}
          <HeroIllustration />

          <h1 className="text-2xl sm:text-3xl font-display tracking-tight mt-5 mb-1">
            {t.title}
          </h1>
          <p className="text-sm text-ink-500 mb-5">{t.subtitle}</p>

          {/* Callout: what works */}
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 mb-6">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm text-amber-900 mb-0.5">
                  {t.calloutTitle}
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {t.calloutBody}
                </p>
              </div>
            </div>
          </div>

          {/* 3 numbered tips with icons */}
          <div className="space-y-4 mb-6">
            <Tip icon={<CameraIcon />} title={t.tip1Title} body={t.tip1} />
            <Tip icon={<SparkleIcon />} title={t.tip2Title} body={t.tip2} />
            <Tip icon={<RulerIcon />} title={t.tip3Title} body={t.tip3} />
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleCta}
            className="w-full px-6 py-3.5 rounded-full bg-ink-900 text-white font-medium hover:bg-ink-700 transition text-sm flex items-center justify-center gap-2"
          >
            {authenticated ? t.ctaLoggedIn : t.ctaSignup}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>

          {/* Footer link (only when logged out) */}
          {!authenticated && (
            <p className="text-center text-xs text-ink-500 mt-4">
              {t.haveAccount}{" "}
              <Link
                href="/login"
                onClick={handleClose}
                className="text-ink-900 font-medium underline underline-offset-2"
              >
                {t.signin}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Tip({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-10 h-10 rounded-full bg-ink-900 text-white flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 pt-1">
        <p className="text-sm font-medium leading-tight mb-1">{title}</p>
        <p className="text-xs text-ink-500 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function HeroIllustration() {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-ink-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/onboarding-hero.jpg"
        alt=""
        width={1600}
        height={1068}
        className="w-full h-auto block"
        loading="eager"
      />
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 L13.5 10.5 L21 12 L13.5 13.5 L12 21 L10.5 13.5 L3 12 L10.5 10.5 Z" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17 L17 3 L21 7 L7 21 Z" />
      <line x1="6" y1="14" x2="8" y2="16" />
      <line x1="9" y1="11" x2="11" y2="13" />
      <line x1="12" y1="8" x2="14" y2="10" />
      <line x1="15" y1="5" x2="17" y2="7" />
    </svg>
  );
}
