"use client";

import type { Lang } from "@/lib/lang";
import { landingCopy } from "./copy";
import {
  Wordmark,
  WaterBg,
  StoreBadges,
  LangToggle,
  FloatingResultCard,
  LegalLinks,
  InAppBrowserNotice,
} from "./LandingBits";

/* Mobile marketing landing. Unlike desktop, the primary CTA ("Kipróbálom")
   and the sticky bottom CTA lead INTO the working app; "Belépés" → login. */
export default function MobileLanding({
  lang,
  setLang,
  onEnter,
  onLogin,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  onEnter: () => void;
  onLogin: () => void;
}) {
  const t = landingCopy[lang];

  return (
    <div className="landing min-h-dvh overflow-x-hidden bg-white pb-24 font-l-sans text-ink">
      <InAppBrowserNotice lang={lang} />
      {/* 1 ── Download banner */}
      <div className="flex items-center justify-between gap-3 bg-ink px-5 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" />
          <span className="text-[13px] text-[#E4E4E4]">{t.hero.nudgeMobileBanner}</span>
        </div>
        <a
          href="#letoltes"
          className="shrink-0 bg-amber px-3.5 py-2 text-[13px] font-bold text-ink active:bg-amber-press"
        >
          {t.cta.download}
        </a>
      </div>

      {/* 2 ── Sticky header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white/[0.94] px-5 py-3.5 backdrop-blur-md">
        <Wordmark className="text-[23px]" />
        <div className="flex items-center gap-3">
          <LangToggle lang={lang} onChange={setLang} size="sm" />
          <button type="button" onClick={onLogin} className="text-[14px] font-semibold">
            {t.nav.login}
          </button>
        </div>
      </header>

      {/* 3 ── Hero */}
      <section className="relative isolate overflow-hidden">
        <WaterBg />
        <div className="relative z-[1] flex flex-col gap-[22px] px-5 pb-[96px] pt-9">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-ink" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#666]">
              {t.hero.eyebrow}
            </span>
          </div>
          <h1 className="font-l-display font-black leading-[0.92] tracking-[-0.035em] text-[clamp(46px,14vw,68px)]">
            {t.hero.h1[0]}
            <br />
            {t.hero.h1[1]}
            <br />
            <span className="italic font-bold">{t.hero.h1[2]}</span>
          </h1>
          <p className="text-[17px] leading-[1.5] text-ink-soft">{t.hero.lead}</p>
          <button
            type="button"
            onClick={onEnter}
            className="flex min-h-[60px] w-full items-center justify-center bg-ink text-[18px] font-bold text-white active:bg-ink-2"
          >
            {t.cta.try}
          </button>
          <div className="relative mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/hero.jpg"
              alt="Air Jordan 4 SB Midnight Navy"
              className="aspect-[4/5] w-full object-cover"
            />
            <FloatingResultCard
              copy={t}
              compact
              className="absolute -bottom-[62px] left-4 w-[208px]"
            />
          </div>
        </div>
      </section>

      {/* 4 ── How it works */}
      <section className="bg-ink px-5 py-10 text-white">
        <h2 className="font-l-display text-[34px] font-extrabold tracking-[-0.02em]">{t.how.title}</h2>
        <div className="mt-7 flex flex-col gap-[30px]">
          {t.how.steps.map((s, i) => (
            <div key={i} className="flex gap-4">
              <span className="min-w-[44px] font-l-display text-[34px] font-extrabold leading-none text-amber">
                0{i + 1}
              </span>
              <div>
                <h3 className="text-[21px] font-bold">{s.title}</h3>
                <p className="mt-1 text-[15px] leading-[1.55] text-muted-body">{s.descShort}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5 ── Features (chips) */}
      <section className="px-5 py-10">
        <h2 className="font-l-display text-[34px] font-extrabold tracking-[-0.02em]">
          {t.features.title}
        </h2>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {t.features.items.slice(0, 6).map((f, i) => (
            <span key={i} className="bg-off px-4 py-3 text-[14px] font-medium">
              {f}
            </span>
          ))}
          <span className="flex items-center gap-1.5 bg-ink px-4 py-3 text-[14px] font-medium text-white">
            {t.features.items[3]}
            <span className="bg-amber px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
              {t.features.proChip}
            </span>
          </span>
        </div>
        <p className="mt-4 text-[14px] text-[#666]">{t.features.mobileFootnote}</p>
      </section>

      {/* 6 ── Pro card */}
      <section className="mx-5 mb-10 bg-off px-[22px] py-7">
        <span className="bg-amber px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink">
          {t.pro.chip}
        </span>
        <h2 className="mt-4 font-l-display text-[30px] font-extrabold leading-[1.02] tracking-[-0.02em]">
          {t.features.items[0]}, {t.features.items[3].toLowerCase()}.
        </h2>
        <p className="mt-3 text-[15px] leading-[1.55] text-ink-soft">
          {t.pro.body}
        </p>
      </section>

      {/* 7 ── Store badges */}
      <section id="letoltes" className="px-5 pb-10 [scroll-margin-top:72px]">
        <StoreBadges heightClass="h-[54px]" />
      </section>

      {/* 8 ── Footer */}
      <footer className="bg-ink px-5 py-10 text-white">
        <span className="font-l-display text-[54px] font-black tracking-[-0.04em]">FitFlip</span>
        <div className="mt-5 flex flex-col gap-2 text-[14px] text-muted-2">
          <LegalLinks copy={t} className="flex-col gap-2" />
          <span>{t.footer.copyright}</span>
        </div>
      </footer>

      {/* 9 ── Sticky bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/[0.95] px-5 pb-[18px] pt-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onEnter}
          className="flex min-h-[56px] w-full items-center justify-center bg-ink text-[17px] font-bold text-white active:bg-amber active:text-ink"
        >
          {t.cta.tryLong}
        </button>
      </div>
    </div>
  );
}
