import type { Lang } from "@/lib/lang";

// All marketing-landing copy, HU + EN. No "AI" / "mesterséges intelligencia"
// anywhere — we sell the outcome (what it's worth, where to sell), never the
// technology. Prices are always "estimated".

export type LandingCopy = {
  nav: { how: string; features: string; pro: string; login: string };
  cta: { download: string; try: string; tryLong: string; proInApp: string; open: string };
  hero: {
    eyebrow: string;
    h1: [string, string, string];
    lead: string;
    nudge: string;
    nudgeMobileBanner: string;
    qrLabel: string;
  };
  card: { model: string; meta: string; estLabel: string; est: string; hype: string };
  how: {
    title: string;
    kicker: string;
    steps: { title: string; desc: string; descShort: string }[];
  };
  features: {
    title: string;
    subtitle: string;
    proChip: string;
    items: string[]; // 7 feature "title — desc" split below
    itemDescs: string[];
    freeNum: string;
    freeText: string;
    alwaysTitle: string;
    alwaysText: string;
    alwaysLink: string;
    mobileFootnote: string;
  };
  proof: {
    kicker: string;
    prev: string;
    next: string;
    quotes: { text: string; who: string }[];
    ph: string[]; // placeholder captions
  };
  pro: {
    chip: string;
    title: string;
    body: string;
    cta: string;
    rows: [string, string][];
  };
  footer: { tagline: string; copyright: string; terms: string; privacy: string };
  ph: { hero: string; heroMobile: string; scan: string };
};

const hu: LandingCopy = {
  nav: { how: "Hogyan működik", features: "Funkciók", pro: "Pro", login: "Belépés" },
  cta: {
    download: "Letöltés",
    try: "Kipróbálom",
    tryLong: "Kipróbálom — napi 3 elemzés ingyen",
    proInApp: "Pro az appban",
    open: "Megnyitom mobilon",
  },
  hero: {
    eyebrow: "Sneaker · Vintage · Streetwear",
    h1: ["Fotózd.", "Azonosítsd.", "Add el."],
    lead: "Sneakerek, vintage ruhák és streetwear — pillanatok alatt.",
    nudge: "A FitFlip a telefonodon működik — töltsd le, vagy nyisd meg mobilon.",
    nudgeMobileBanner: "A FitFlip a telefonodon a legjobb — töltsd le az appot.",
    qrLabel: "Olvasd be a telefonoddal",
  },
  card: {
    model: "Jordan 4 SB Midnight Navy",
    meta: "2024 · új állapot",
    estLabel: "Becsült érték",
    est: "82–105 e Ft",
    hype: "▲ hype 90",
  },
  how: {
    title: "Hogyan működik",
    kicker: "Három lépés",
    steps: [
      {
        title: "Fotózd le a darabot",
        desc: "Sneaker, kabát, póló — elég egy kép a telefonodról, akár a turkálóban állva.",
        descShort: "Elég egy kép — akár a turkálóban állva.",
      },
      {
        title: "Azonnal megtudod, mi az",
        desc: "Márka, modell, korszak és állapot — plusz a becsült piaci ártartomány.",
        descShort: "Márka, modell, korszak, állapot + becsült piaci ártartomány.",
      },
      {
        title: "Élő hirdetések",
        desc: "Látod, hol és mennyiért mozog most a darab — hogy tudd, hol add el.",
        descShort: "Látod, hol és mennyiért add el.",
      },
    ],
  },
  features: {
    title: "Funkciók",
    subtitle: "Amit a telefonod tud",
    proChip: "Pro",
    items: [
      "Azonnali felismerés",
      "Becsült ártartomány",
      "Élő hirdetések",
      "Árfigyelők",
      "Hype-pontszám",
      "Scan-előzmények",
      "Méret-egyeztetés",
    ],
    itemDescs: [
      "Okos képfelismerés: pillanatok alatt beazonosítja a darabot.",
      "Valós hirdetések alapján számolt piaci sáv — nem ígéret, hanem irány.",
      "Vinted, Jófogás, eBay — egy helyen, kattintásra.",
      "Szólunk, ha mozdul az ár a figyelt daraboknál.",
      "Mennyire keresett most a darab — 0-tól 100-ig.",
      "Minden fogásod egy helyen, kereshetően.",
      "EU, UK, US — a címkéről a helyes méretre.",
    ],
    freeNum: "3",
    freeText: "ingyenes elemzés minden nap — regisztráció után.",
    alwaysTitle: "Mindig kéznél van",
    alwaysText: "iPhone, Android és mobil web — a turkálóban, a polc előtt.",
    alwaysLink: "Letöltés",
    mobileFootnote: "Vinted, Jófogás és eBay hirdetésekből számolt piaci sáv.",
  },
  proof: {
    kicker: "A közösség fogásai",
    prev: "Előző",
    next: "Következő",
    quotes: [
      { text: "Négy hónap alatt kétszer annyi darabot sikerült eladnom.", who: "Réka — Budapest" },
      { text: "A polcnál eldől, hogy megéri-e. Most tíz másodperc alatt tudom.", who: "Máté — Budapest" },
      { text: "Egy 2000 forintos kabátról derült ki, hogy tizenötezret ér.", who: "Anna — Szeged" },
    ],
    ph: ["turkáló-fogás", "vintage kabát", "sneaker páros"],
  },
  pro: {
    chip: "FitFlip Pro",
    title: "Ha a turkálásból\nmunka lesz.",
    body: "Korlátlan azonosítás, árfigyelők és mélyebb elemzés. Ingyenesen napi 3 elemzés jár.",
    cta: "Pro az appban",
    rows: [
      ["Azonosítás naponta", "Korlátlan"],
      ["Árfigyelők", "Bekapcsolva"],
      ["Mélyebb elemzés", "Bekapcsolva"],
      ["Ingyenes csomag", "napi 3 elemzés"],
    ],
  },
  footer: {
    tagline: "Fotózd. Azonosítsd. Add el. Elérhető iPhone-on, Androidon és mobil weben.",
    copyright: "© 2026 FitFlip",
    terms: "Felhasználási feltételek",
    privacy: "Adatvédelem",
  },
  ph: {
    hero: "hero fotó: sneaker + vintage darab, semleges háttér",
    heroMobile: "sneaker fotó, semleges háttér",
    scan: "scan",
  },
};

const en: LandingCopy = {
  nav: { how: "How it works", features: "Features", pro: "Pro", login: "Log in" },
  cta: {
    download: "Download",
    try: "Try it",
    tryLong: "Try it — 3 free scans a day",
    proInApp: "Pro in the app",
    open: "Open on mobile",
  },
  hero: {
    eyebrow: "Sneaker · Vintage · Streetwear",
    h1: ["Snap.", "Identify.", "Sell."],
    lead: "Sneakers, vintage and streetwear — in seconds.",
    nudge: "FitFlip works on your phone — download it, or open it on mobile.",
    nudgeMobileBanner: "FitFlip is best on your phone — download the app.",
    qrLabel: "Scan with your phone",
  },
  card: {
    model: "Jordan 4 SB Midnight Navy",
    meta: "2024 · new",
    estLabel: "Estimated value",
    est: "€220–280",
    hype: "▲ hype 90",
  },
  how: {
    title: "How it works",
    kicker: "Three steps",
    steps: [
      {
        title: "Snap the piece",
        desc: "Sneaker, jacket, tee — one photo from your phone, even standing in the thrift store.",
        descShort: "One photo — even in the thrift store.",
      },
      {
        title: "Know what it is instantly",
        desc: "Brand, model, era and condition — plus the estimated market price range.",
        descShort: "Brand, model, era, condition + estimated price range.",
      },
      {
        title: "Live listings",
        desc: "See where and for how much it's moving right now — so you know where to sell.",
        descShort: "See where and for how much to sell.",
      },
    ],
  },
  features: {
    title: "Features",
    subtitle: "What your phone can do",
    proChip: "Pro",
    items: [
      "Instant recognition",
      "Estimated range",
      "Live listings",
      "Price watchers",
      "Hype score",
      "Scan history",
      "Size matching",
    ],
    itemDescs: [
      "Smart image recognition: identifies the piece in seconds.",
      "A market range based on real listings — a guide, not a promise.",
      "Vinted, Jófogás, eBay — in one place, one tap away.",
      "We'll ping you when the price moves on watched pieces.",
      "How wanted the piece is right now — 0 to 100.",
      "Every find in one place, searchable.",
      "EU, UK, US — from the label to the right size.",
    ],
    freeNum: "3",
    freeText: "free scans every day — after signing up.",
    alwaysTitle: "Always in your pocket",
    alwaysText: "iPhone, Android and mobile web — in the thrift store, at the rack.",
    alwaysLink: "Download",
    mobileFootnote: "Market range from Vinted, Jófogás and eBay listings.",
  },
  proof: {
    kicker: "Finds from the community",
    prev: "Previous",
    next: "Next",
    quotes: [
      { text: "In four months I sold twice as many pieces.", who: "Réka — Budapest" },
      { text: "At the rack you decide if it's worth it. Now I know in ten seconds.", who: "Máté — Budapest" },
      { text: "A €5 jacket turned out to be worth €40.", who: "Anna — Szeged" },
    ],
    ph: ["thrift find", "vintage jacket", "sneaker pair"],
  },
  pro: {
    chip: "FitFlip Pro",
    title: "When thrifting\nbecomes work.",
    body: "Unlimited identification, price watchers and deeper analysis. 3 free scans a day.",
    cta: "Pro in the app",
    rows: [
      ["Scans per day", "Unlimited"],
      ["Price watchers", "On"],
      ["Deeper analysis", "On"],
      ["Free plan", "3 scans a day"],
    ],
  },
  footer: {
    tagline: "Snap. Identify. Sell. Available on iPhone, Android and mobile web.",
    copyright: "© 2026 FitFlip",
    terms: "Terms of Use",
    privacy: "Privacy",
  },
  ph: {
    hero: "hero photo: sneaker + vintage piece, neutral background",
    heroMobile: "sneaker photo, neutral background",
    scan: "scan",
  },
};

export const landingCopy: Record<Lang, LandingCopy> = { hu, en };
