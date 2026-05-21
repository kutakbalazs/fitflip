"use client";

type Props = {
  open: boolean;
  onClose: () => void;
  lang: "hu" | "en";
};

export default function OnboardingModal({ open, onClose, lang }: Props) {
  if (!open) return null;

  const t =
    lang === "hu"
      ? {
          title: "Üdv a FitFlip-ben",
          sub: "Fotózd le, és pillanatok alatt megtudod mi az és mit ér.",
          tip1Title: "Mit lehet azonosítani",
          tip1: "Sneakerek, vintage ruhák, streetwear, designer darabok. A modern szériák a legpontosabbak.",
          tip2Title: "Ideális fotó",
          tip2: "Egyenes, jó megvilágítású kép, lehetőleg fehér háttér. Címkét, talp-mintázatot, varrást is mutasd, ha tudod.",
          tip3Title: "Méret = pontosabb ár",
          tip3: "A feltöltési képernyőn megadhatod a darab méretét. Pontosabb piaci becslés, és kiemeljük a méretedhez illő hirdetéseket.",
          cta: "Értem, kezdhetjük",
        }
      : {
          title: "Welcome to FitFlip",
          sub: "Snap a photo and find out what it is and what it's worth.",
          tip1Title: "What it identifies",
          tip1: "Sneakers, vintage clothing, streetwear, designer pieces. Modern series are most accurate.",
          tip2Title: "Best photo",
          tip2: "Straight angle, well-lit, ideally white background. Show tags, sole patterns, stitching when possible.",
          tip3Title: "Size = better price",
          tip3: "You can enter the item's size on the upload screen. Tighter price estimate, and we highlight matching listings.",
          cta: "Got it, let's go",
        };

  const handleClose = () => {
    try {
      localStorage.setItem("ff-onboarded", "1");
    } catch {
      /* ignore */
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl fade-in">
        <h2 className="text-2xl font-display tracking-tight mb-1">{t.title}</h2>
        <p className="text-sm text-ink-500 mb-6 leading-relaxed">{t.sub}</p>

        <div className="space-y-4 mb-6">
          <Tip num={1} title={t.tip1Title} body={t.tip1} />
          <Tip num={2} title={t.tip2Title} body={t.tip2} />
          <Tip num={3} title={t.tip3Title} body={t.tip3} />
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="w-full px-6 py-3 rounded-full bg-ink-900 text-white font-medium hover:bg-ink-700 transition text-sm"
        >
          {t.cta}
        </button>
      </div>
    </div>
  );
}

function Tip({ num, title, body }: { num: number; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-ink-900 text-white text-xs font-medium flex items-center justify-center">
        {num}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium mb-0.5">{title}</p>
        <p className="text-xs text-ink-500 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
