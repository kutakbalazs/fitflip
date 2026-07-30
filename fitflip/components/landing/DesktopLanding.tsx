"use client";

import { useRef } from "react";
import Link from "next/link";
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

/* Desktop marketing landing. No app functionality — the conversion is the
   download (spec: desktop = download-focused, no scan / no login-first CTA). */
export default function DesktopLanding({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  const t = landingCopy[lang];
  const proofRef = useRef<HTMLDivElement>(null);

  const scrollProof = (dir: 1 | -1) => {
    const el = proofRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = (card?.offsetWidth ?? 320) + 20;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className="landing min-h-dvh bg-white font-l-sans text-ink">
      <InAppBrowserNotice lang={lang} />
      {/* 1 ── Sticky header */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/[0.92] backdrop-blur-md">
        <div className="mx-auto flex max-w-shell items-center justify-between px-14 py-5">
          <div className="flex items-center gap-10">
            <Wordmark className="text-[28px]" />
            <nav className="flex items-center gap-9 text-[14px] text-[#444]">
              <a href="#hogyan">{t.nav.how}</a>
              <a href="#funkciok">{t.nav.features}</a>
              <a href="#pro">{t.nav.pro}</a>
            </nav>
          </div>
          <div className="flex items-center gap-[18px]">
            <LangToggle lang={lang} onChange={setLang} />
            <StoreBadges heightClass="h-[38px]" />
          </div>
        </div>
      </header>

      {/* 2 ── Hero */}
      <section className="relative isolate overflow-hidden">
        <WaterBg />
        <div className="relative z-[1] mx-auto grid max-w-shell items-center gap-16 px-14 pb-[88px] pt-24 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
          {/* left */}
          <div className="flex flex-col items-start gap-8">
            <div className="flex items-center gap-3">
              <span className="h-px w-7 bg-ink" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#666]">
                {t.hero.eyebrow}
              </span>
            </div>
            <h1 className="font-l-display font-black leading-[0.92] tracking-[-0.035em] text-[clamp(56px,6.6vw,116px)]">
              {t.hero.h1[0]}
              <br />
              {t.hero.h1[1]}
              <br />
              <span className="italic font-bold">{t.hero.h1[2]}</span>
            </h1>
            <p className="max-w-[30ch] text-[21px] leading-[1.5] text-ink-soft">{t.hero.lead}</p>
            <div id="letoltes" className="scroll-mt-24">
              <StoreBadges heightClass="h-[60px]" />
            </div>
            {/* QR — desktop users open the mobile site on their phone (addition) */}
            <div className="flex items-center gap-4 bg-off px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/qr.png" alt="QR" className="h-[84px] w-[84px]" />
              <p className="max-w-[18ch] text-[13px] leading-[1.4] text-ink-soft">
                {t.hero.qrLabel}
              </p>
            </div>
            {/* mobile nudge */}
            <div className="flex items-center gap-2 bg-off px-[18px] py-3.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              <span className="text-[14px] text-ink-soft">{t.hero.nudge}</span>
            </div>
          </div>
          {/* right */}
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/hero.jpg"
              alt="Air Jordan 4 SB Midnight Navy"
              className="aspect-[4/5] w-full object-cover"
            />
            <FloatingResultCard copy={t} className="absolute -left-[92px] bottom-16 w-[210px]" />
          </div>
        </div>
      </section>

      {/* 3 ── How it works */}
      <section id="hogyan" className="scroll-mt-20 bg-ink text-white">
        <div className="mx-auto max-w-shell px-14 py-24">
          <div className="flex items-end justify-between border-b border-line-dark pb-7">
            <h2 className="font-l-display font-extrabold leading-none tracking-[-0.03em] text-[clamp(38px,4vw,64px)]">
              {t.how.title}
            </h2>
            <span className="text-[12px] uppercase tracking-[0.2em] text-muted">{t.how.kicker}</span>
          </div>
          <div className="mt-14 grid gap-12 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
            {t.how.steps.map((s, i) => (
              <div key={i} className="flex flex-col gap-4">
                <span className="font-l-display text-[64px] font-extrabold leading-none text-amber">
                  0{i + 1}
                </span>
                <h3 className="text-[27px] font-bold">{s.title}</h3>
                <p className="max-w-[34ch] text-[16px] leading-[1.65] text-muted-body">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 ── Features */}
      <section id="funkciok" className="scroll-mt-20">
        <div className="mx-auto max-w-shell px-14 py-24">
          <div className="flex items-end justify-between border-b border-line pb-7">
            <h2 className="font-l-display font-extrabold leading-none tracking-[-0.03em] text-[clamp(38px,4vw,64px)]">
              {t.features.title}
            </h2>
            <span className="text-[12px] uppercase tracking-[0.2em] text-muted">
              {t.features.subtitle}
            </span>
          </div>
          <div className="mt-10 grid gap-px bg-line [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {t.features.items.map((title, i) => (
              <div key={i} className="flex flex-col gap-3 bg-white px-8 py-9">
                <div className="flex items-center gap-2">
                  <h3 className="text-[19px] font-bold">{title}</h3>
                  {i === 3 && (
                    <span className="bg-amber px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
                      {t.features.proChip}
                    </span>
                  )}
                </div>
                <p className="text-[15px] leading-[1.6] text-[#555]">{t.features.itemDescs[i]}</p>
              </div>
            ))}
            {/* free-tier highlight cell — closes out a clean 2-row grid (8 cells) */}
            <div className="flex flex-col gap-3 bg-off px-8 py-9">
              <span className="font-l-display text-[40px] font-extrabold leading-none text-emerald">
                {t.features.freeNum}
              </span>
              <p className="text-[15px] leading-[1.6] text-[#555]">{t.features.freeText}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5 ── Social proof carousel */}
      <section className="mx-auto max-w-shell px-14 pb-[104px]">
        <div className="flex items-center justify-between">
          <span className="text-[12px] uppercase tracking-[0.2em] text-muted">{t.proof.kicker}</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => scrollProof(-1)}
              aria-label={t.proof.prev}
              className="flex h-[46px] w-[46px] items-center justify-center border border-line-2 bg-white hover:border-ink"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollProof(1)}
              aria-label={t.proof.next}
              className="flex h-[46px] w-[46px] items-center justify-center border border-line-2 bg-white hover:border-ink"
            >
              →
            </button>
          </div>
        </div>
        <div
          ref={proofRef}
          className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth"
        >
          {/* testimonials (photo cards added once real carousel photos land) */}
          <ProofCard className="flex flex-col justify-between bg-ink p-8 text-white">
            <p className="font-l-display text-[24px] italic leading-[1.35]">
              „{t.proof.quotes[0].text}"
            </p>
            <span className="text-[12px] uppercase tracking-[0.16em] text-muted">
              {t.proof.quotes[0].who}
            </span>
          </ProofCard>
          <ProofCard className="flex flex-col justify-between border border-line bg-white p-8">
            <p className="font-l-display text-[24px] italic leading-[1.35]">
              „{t.proof.quotes[1].text}"
            </p>
            <span className="text-[12px] uppercase tracking-[0.16em] text-muted">
              {t.proof.quotes[1].who}
            </span>
          </ProofCard>
          <ProofCard className="flex flex-col justify-between bg-off p-8">
            <p className="font-l-display text-[24px] italic leading-[1.35]">
              „{t.proof.quotes[2].text}"
            </p>
            <span className="text-[12px] uppercase tracking-[0.16em] text-muted">
              {t.proof.quotes[2].who}
            </span>
          </ProofCard>
        </div>
      </section>

      {/* 6 ── FitFlip Pro */}
      <section id="pro" className="scroll-mt-20 bg-off">
        <div className="mx-auto grid max-w-shell items-center gap-[72px] px-14 py-[104px] [grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr))]">
          <div className="flex flex-col items-start gap-6">
            <span className="bg-amber px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink">
              {t.pro.chip}
            </span>
            <h2 className="whitespace-pre-line font-l-display font-extrabold leading-[0.98] tracking-[-0.02em] text-[clamp(38px,4.2vw,68px)]">
              {t.pro.title}
            </h2>
            <p className="max-w-[40ch] text-[18px] leading-[1.55] text-ink-soft">{t.pro.body}</p>
            <a
              href="#letoltes"
              className="bg-ink px-[30px] py-4 text-[15px] font-semibold text-white transition-colors hover:bg-amber hover:text-ink"
            >
              {t.pro.cta}
            </a>
          </div>
          <div className="border border-line-3 bg-white p-11">
            {t.pro.rows.map((row, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-[18px] ${
                  i < t.pro.rows.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className={i === t.pro.rows.length - 1 ? "text-[14px] text-[#777]" : "text-[15px]"}>
                  {row[0]}
                </span>
                <span
                  className={
                    i === 0
                      ? "font-l-display text-[18px] font-extrabold"
                      : i === t.pro.rows.length - 1
                        ? "text-[14px] text-[#777]"
                        : "text-[14px] font-semibold text-emerald"
                  }
                >
                  {row[1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 ── Footer */}
      <footer className="bg-ink text-white">
        <div className="mx-auto max-w-shell px-14 pb-11 pt-[72px]">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <span className="font-l-display font-black leading-[0.85] tracking-[-0.04em] text-[clamp(56px,9vw,150px)]">
              FitFlip
            </span>
            <p className="max-w-[30ch] text-[15px] text-muted-2">{t.footer.tagline}</p>
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line-dark pt-6">
            <span className="text-[13px] text-muted-2">{t.footer.copyright}</span>
            <LegalLinks copy={t} />
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProofCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      data-card
      className={`h-[424px] shrink-0 grow-0 basis-[min(320px,78%)] snap-start ${className}`}
    >
      {children}
    </div>
  );
}
