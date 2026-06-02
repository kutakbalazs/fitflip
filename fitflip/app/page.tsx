"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { translations, type Lang } from "@/lib/translations";
import type { Listing } from "@/lib/listings/types";
import { extractSizeTokens, listingMatchesSize } from "@/lib/listings/sizeMatch";
import LegalFooter from "@/components/LegalFooter";
import BackToTop from "@/components/BackToTop";
import StoryModal from "@/components/StoryModal";
import NotificationsBell from "@/components/NotificationsBell";
import WatcherWidget from "@/components/WatcherWidget";
import { haptic } from "@/lib/haptics";
import { createClient } from "@/lib/supabase/client";

type AnalysisResult = {
  recognized: boolean;
  category: string | null;
  item_type: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  visual_keywords: string[] | null;
  era: string | null;
  condition: string | null;
  is_definitely_new: boolean | null;
  retail_price_huf: number | null;
  defects: string[] | null;
  condition_discount_pct: number | null;
  estimated_value_min_huf: number | null;
  estimated_value_max_huf: number | null;
  description: string | null;
  search_query: string | null;
  selling_tip: string | null;
  confidence: "low" | "medium" | "high" | null;
  story: string | null;
  hype_score: number | null;
  hype_label: string | null;
  scan_id: string | null;
  scansLeft: number;
};

type SearchParams = {
  brand: string;
  model: string;
  color: string;
  itemType: string;
  queries: string[];
  brandTokens: string[];
  modelTokens: string[];
  colorTokens: string[];
};

const MAX_IMAGES = 6;

function hypeBadgeStyle(score: number): string {
  // Score-tiered palette, FitFlip-stílus: monokróm ink alapok meleg accentekkel.
  if (score >= 9) return "bg-ink-900 text-white";
  if (score >= 7) return "bg-amber-100 text-amber-900 dark:text-amber-200";
  if (score >= 5) return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200";
  return "bg-white dark:bg-ink-950 text-ink-700 dark:text-ink-200 border border-ink-200 dark:border-ink-700";
}

const isHeicFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
};

async function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not available"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Blob creation failed"));
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export default function HomePage() {
  const supabase = createClient();
  const [lang, setLang] = useState<Lang>("hu");
  const [images, setImages] = useState<Array<{ id: string; data: string; mediaType: string; preview: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scansLeft, setScansLeft] = useState<number>(0);
  const [limitReached, setLimitReached] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [banner, setBanner] = useState<{ kind: "success" | "info"; text: string } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showUpgradeConsent, setShowUpgradeConsent] = useState(false);
  const [upgradeConsentChecked, setUpgradeConsentChecked] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [listingsExact, setListingsExact] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [lastSearchParams, setLastSearchParams] = useState<SearchParams | null>(null);
  // Refinement flow: when the AI is uncertain (brand=null or confidence=low),
  // we pause the listings fetch and offer a tiny "Pontosítás" widget.
  const [refinementText, setRefinementText] = useState("");
  const [refinementDismissed, setRefinementDismissed] = useState(false);
  const [refinementLoading, setRefinementLoading] = useState(false);
  // Optional size, surfaced once a photo is picked. Helps the model when
  // it's pricing sized goods (sneakers, jeans).
  const [sizeInput, setSizeInput] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  useEffect(() => {
    const stored = (localStorage.getItem("ff-lang") ?? localStorage.getItem("ff_lang"));
    if (stored === "hu" || stored === "en") setLang(stored);

    supabase.auth.getUser().then(({ data }) => {
      setAuthenticated(!!data.user);
      setUserEmail(data.user?.email ?? null);
      if (data.user) {
        const currentLang = ((localStorage.getItem("ff-lang") ?? localStorage.getItem("ff_lang")) as Lang | null) ?? "hu";
        const userLang = (data.user.user_metadata as { lang?: string } | null)?.lang;
        if (userLang !== currentLang) {
          supabase.auth.updateUser({ data: { lang: currentLang } }).catch(() => {});
        }
      }
    });

    fetch("/api/analyze")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.scansLeft === "number") {
          setScansLeft(d.scansLeft);
          if (d.authenticated && d.scansLeft <= 0 && !d.isPremium) setLimitReached(true);
        }
        if (d.isPremium) setIsPremium(true);
      })
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "1") {
      const isHu = ((localStorage.getItem("ff-lang") ?? localStorage.getItem("ff_lang")) ?? "hu") === "hu";
      setBanner({ kind: "success", text: isHu ? "Sikeres előfizetés! Mostantól korlátlan a használat." : "Subscription successful! You now have unlimited use." });
      window.history.replaceState({}, "", "/");
    } else if (params.get("upgrade") === "cancel") {
      const isHu = ((localStorage.getItem("ff-lang") ?? localStorage.getItem("ff_lang")) ?? "hu") === "hu";
      setBanner({ kind: "info", text: isHu ? "Az előfizetést megszakítottad." : "You cancelled the upgrade." });
      window.history.replaceState({}, "", "/");
    }
  }, [supabase]);

  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 6000);
    return () => window.clearTimeout(id);
  }, [banner]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileMenuOpen]);

  // Live camera background on mobile
  useEffect(() => {
    if (authenticated !== true) return;
    if (typeof window === "undefined") return;
    if (images.length > 0 || result || limitReached) return;

    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    if (!isMobile) return;
    if (!navigator.mediaDevices?.getUserMedia) return;

    let cancelled = false;
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {
        // Permission denied or no camera — silent fallback to plain background
      });

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [authenticated, images.length, result, limitReached]);

  const switchLang = (newLang: Lang) => {
    setLang(newLang);
    try {
      localStorage.setItem("ff-lang", newLang);
      localStorage.setItem("ff_lang", newLang);
    } catch {
      /* ignore */
    }
  };

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);

      let workingFile: File = file;

      if (isHeicFile(file)) {
        setConverting(true);
        try {
          const heic2any = (await import("heic2any")).default;
          const converted = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.9,
          });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          workingFile = new File(
            [blob],
            file.name.replace(/\.(heic|heif)$/i, ".jpg"),
            { type: "image/jpeg" }
          );
        } catch {
          setError(
            lang === "hu"
              ? "Nem sikerült konvertálni a HEIC fájlt. Próbálj egy JPG vagy PNG képpel."
              : "Couldn't convert HEIC file. Try a JPG or PNG instead."
          );
          setConverting(false);
          return;
        }
        setConverting(false);
      }

      if (!workingFile.type.startsWith("image/")) {
        setError(lang === "hu" ? "Csak képfájlokat tudunk feldolgozni." : "Only image files are supported.");
        return;
      }

      try {
        const compressed = await compressImage(workingFile);
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          setImages((prev) => {
            if (prev.length >= MAX_IMAGES) {
              setError(
                lang === "hu"
                  ? `Maximum ${MAX_IMAGES} kép tölthető fel egy elemzéshez.`
                  : `You can upload up to ${MAX_IMAGES} photos per analysis.`
              );
              return prev;
            }
            return [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                data: base64,
                mediaType: "image/jpeg",
                preview: result,
              },
            ];
          });
        };
        reader.readAsDataURL(compressed);
      } catch {
        setError(lang === "hu" ? "Nem sikerült feldolgozni a képet." : "Couldn't process the image.");
      }
    },
    [lang]
  );

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((f) => processFile(f));
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;
    Array.from(files).forEach((f) => processFile(f));
  };

  useEffect(() => {
    if (!result) {
      setListings(null);
      return;
    }
    const brand = result.brand?.trim() ?? "";
    const model = result.model?.trim() ?? "";
    const color = result.color?.trim() ?? "";
    const fallbackQuery = result.search_query?.trim() ?? "";
    const visualKeywords = Array.isArray(result.visual_keywords)
      ? result.visual_keywords.map((k) => k?.trim()).filter((k): k is string => !!k)
      : [];

    // Always fetch — even when the AI is uncertain about the brand.
    // The refinement widget is still rendered above the listings as a
    // visible CTA; the user can refine to get fresh, more accurate
    // results, but they don't have to.

    const STOP_WORDS = new Set([
      "pants", "pant", "trousers", "trouser", "jeans",
      "shoes", "shoe", "sneakers", "sneaker", "boots", "boot",
      "shirt", "tshirt", "tee", "jacket", "coat", "hoodie", "sweater",
      "the", "a", "and",
      // Generic sneaker descriptors — appear in too many listings to be
      // useful for distinguishing the specific product. The "high vs low"
      // distinction matters but it's already encoded in the colorway
      // (most Jordan colorways come in only one cut anyway).
      "retro", "og",
    ]);

    // brandTokens: every word of the brand counts as an alternative — many
    // marketplace listings only mention one word of a compound brand
    // (e.g. "Jordan" for "Air Jordan", "Carhartt" for "Carhartt WIP").
    const brandTokens = brand.split(/\s+/).filter(Boolean);

    // Sub-brand rescue: when the AI labels the parent brand (e.g. "Nike")
    // but the model itself starts with or mentions a well-known sub-brand,
    // treat that sub-brand as the search-keyword brand AND strip it off
    // the model so the leading model token isn't a brand word. Without
    // this, a "Nike" brand + "Air Jordan 1 Retro High" model would
    // produce a useless short query like "jordan Air" instead of "Jordan 1".
    const SUB_BRAND_PHRASES = ["Air Jordan", "Jordan", "Yeezy", "Supreme"];
    let cleanModel = model;
    for (const sub of SUB_BRAND_PHRASES) {
      const subLower = sub.toLowerCase();
      const ml = cleanModel.toLowerCase();
      if (
        ml === subLower ||
        ml.startsWith(subLower + " ") ||
        ml.startsWith(subLower + ",")
      ) {
        cleanModel = cleanModel.substring(sub.length).replace(/^[\s,]+/, "");
      }
      const lastWord = sub.split(" ").pop() as string;
      if (
        ml.includes(subLower) &&
        !brandTokens.some((b) => b.toLowerCase() === lastWord.toLowerCase())
      ) {
        brandTokens.push(lastWord);
      }
    }

    const modelTokens = cleanModel
      .split(/\s+/)
      .filter(Boolean)
      .filter((w) => !STOP_WORDS.has(w.toLowerCase()))
      .slice(0, 3);
    const colorTokens = color.split(/\s+/).filter(Boolean);

    // Run multiple search variants. Different marketplaces respond very
    // differently to different phrasings — Jofogás in particular keys on
    // exact word matches, so a listing titled "Jordan 1 high mocha" never
    // shows up for "Air Jordan 1 High" but ranks first for "Jordan Mocha".
    // We cast a wider net and dedupe server-side.
    const queries: string[] = [];
    const lastBrand = brandTokens[brandTokens.length - 1] ?? "";
    const firstModel = modelTokens[0] ?? "";
    const firstColor = colorTokens[0] ?? "";
    const lastColor = colorTokens[colorTokens.length - 1] ?? "";
    const pushQuery = (q: string) => {
      const trimmed = q.trim();
      if (trimmed && !queries.includes(trimmed)) queries.push(trimmed);
    };

    if (brand) {
      // Standard path: brand + model based queries.
      // 1. Full brand + model.
      pushQuery([brand, model].filter(Boolean).join(" "));
      // 2. AI's free-form search_query.
      if (fallbackQuery) pushQuery(fallbackQuery);
      // 3. Sub-brand + first model word, e.g. "Jordan 1" — captures
      //    marketplace listings that omit the parent brand ("Nike", "Air").
      if (lastBrand && firstModel) pushQuery(`${lastBrand} ${firstModel}`);
      // 4. Sub-brand + first model word + color, e.g. "Jordan 1 mocha" —
      //    typically the highest-recall query on Hungarian classifieds.
      if (lastBrand && firstModel && firstColor) {
        pushQuery(`${lastBrand} ${firstModel} ${firstColor}`);
      }
      // 5. Sub-brand + colorway alone, e.g. "Jordan Mocha".
      if (lastBrand && lastColor) pushQuery(`${lastBrand} ${lastColor}`);
      if (queries.length === 0 && brandTokens[0]) pushQuery(brandTokens[0]);
    } else {
      // Brand-null fallback: use the AI's visual_keywords as search phrases.
      // Each keyword is already crafted to be marketplace-search-friendly
      // (e.g. "leather brown high-top sneaker"). Visual verification is what
      // saves us from random matches here, not text filtering.
      for (const kw of visualKeywords.slice(0, 3)) pushQuery(kw);
      if (fallbackQuery) pushQuery(fallbackQuery);
      // Also try the user's hint phrase mixed with color as a last resort.
      if (visualKeywords.length === 0 && color) pushQuery(color + " clothing");
    }

    if (queries.length === 0) {
      setListings(null);
      return;
    }

    const firstImage = images[0];
    const originalImage = firstImage
      ? { data: firstImage.data, mediaType: firstImage.mediaType }
      : null;

    // Snapshot the computed search params so the WatcherWidget can later
    // POST them to /api/watchers without re-deriving anything.
    setLastSearchParams({
      brand,
      model,
      color,
      itemType: result.item_type ?? "",
      queries,
      brandTokens,
      modelTokens,
      colorTokens,
    });

    let cancelled = false;
    setListingsLoading(true);
    setListings(null);
    fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries,
        brandTokens,
        modelTokens,
        colorTokens,
        brand,
        model,
        color,
        itemType: result.item_type ?? "",
        ...(originalImage ? { originalImage } : {}),
      }),
    })
      .then(async (res) => {
        if (!res.ok) return { listings: [] as Listing[], exact: true };
        const data = await res.json();
        const items = Array.isArray(data?.listings) ? (data.listings as Listing[]) : [];
        return { listings: items, exact: data?.exact !== false };
      })
      .then(({ listings: items, exact }) => {
        if (cancelled) return;
        setListings(items);
        setListingsExact(exact);
      })
      .catch(() => {
        if (cancelled) return;
        setListings([]);
        setListingsExact(true);
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPremium, result, refinementDismissed]);

  useEffect(() => {
    if (authenticated !== true) return;
    if (limitReached) return;

    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      if (loading || converting) return;

      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
          }
          break;
        }
      }
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [authenticated, limitReached, loading, converting, processFile]);

  const analyze = async (hint?: string) => {
    if (images.length === 0) return;
    if (!hint) {
      // Fresh scan — reset any refinement state from a previous result.
      setRefinementDismissed(false);
      setRefinementText("");
    }
    setLoading(true);
    setError(null);
    try {
      const trimmedSize = sizeInput.trim();
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map(({ data, mediaType }) => ({ data, mediaType })),
          lang,
          ...(hint ? { hint } : {}),
          ...(trimmedSize ? { size: trimmedSize } : {}),
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 429) {
        setLimitReached(true);
        setScansLeft(0);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(t.error);
        setLoading(false);
        return;
      }
      setResult(data);
      haptic("success");
      if (typeof data.scansLeft === "number") {
        setScansLeft(data.scansLeft);
        if (data.scansLeft <= 0) setLimitReached(true);
      }
    } catch {
      setError(t.error);
      haptic("error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImages([]);
    setResult(null);
    setError(null);
    setListings(null);
    setListingsExact(true);
    setRefinementText("");
    setRefinementDismissed(false);
    setRefinementLoading(false);
    setSizeInput("");
    setLastSearchParams(null);
  };

  const submitRefinement = async () => {
    const hint = refinementText.trim();
    if (!hint || refinementLoading) return;
    setRefinementLoading(true);
    setError(null);
    try {
      const trimmedSize = sizeInput.trim();
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map(({ data, mediaType }) => ({ data, mediaType })),
          lang,
          hint,
          ...(trimmedSize ? { size: trimmedSize } : {}),
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(t.error);
        return;
      }
      setResult(data);
      // If the AI is now confident the listings panel will fetch on its own.
      // Keep refinementDismissed = false so the user can refine again if the
      // hint didn't help.
    } catch {
      setError(t.error);
    } finally {
      setRefinementLoading(false);
    }
  };

  const formatHuf = (n: number | null) => {
    if (n === null) return "—";
    return new Intl.NumberFormat("hu-HU").format(n) + " Ft";
  };

  // Heuristic: does a listing read as new vs used? Marketplace titles and
  // built-in condition fields leak condition wording in many languages.
  // Vinted in particular pulls from across the EU (Polish, Romanian, Czech,
  // Slovak listings appear on vinted.hu), so the regex covers those too.
  const NEW_WORDS =
    /\b(új|újszerű|címkével|csak felpróbált|kihagy(t|va)|new|nwt|bnib|deadstock|ds|unworn|brand new|with tags|tags attached|neu|neuwertig|ungetragen|ovp|nie getragen|nowe|nowy|nowa|nieuży|z met(k|ką)|nou|nouă|neoplata|nové|nový|nepoužitý)\b/i;
  const listingLooksNew = (l: Listing): boolean => {
    const blob = `${l.condition ?? ""} ${l.title}`;
    return NEW_WORDS.test(blob);
  };

  // Derive a "market range" from verified listings' prices. Q1 and Q3 are
  // robust to the cheap outliers and ambitious high-asks that marketplace
  // sellers post, so the user sees a realistic typical-ask band rather
  // than a misleading min/max.
  //
  // Filter rules:
  // - Only when the AI identified the brand AND the listing set is exact —
  //   broader/visual-similar results would skew the range.
  // - Only listings whose condition roughly matches the scanned item's
  //   condition feed into the calculation. A new item shouldn't be priced
  //   using used listings (and vice versa). The grid still shows every
  //   listing — this filter only affects the price band.
  // - Falls back to the full set if the condition filter leaves < 2 priced
  //   listings, so we still display something.
  const sizeTokens = extractSizeTokens(sizeInput.trim());
  const displayedListings: Array<{ listing: Listing; match: boolean }> | null = (() => {
    if (!listings) return null;
    const withMatch = listings.map((l) => ({
      listing: l,
      match: sizeTokens.length > 0 && listingMatchesSize(l.title, sizeTokens),
    }));
    if (sizeTokens.length > 0) {
      withMatch.sort((a, b) => Number(b.match) - Number(a.match));
    }
    return withMatch;
  })();

  const marketStats:
    | { q1: number; q3: number; count: number; conditionTag: "new" | "used" | "mixed" }
    | null = (() => {
    if (!listings) return null;
    if (!listingsExact) return null;
    if (!result?.brand?.trim()) return null;

    const priced = listings.filter(
      (l): l is Listing & { priceHuf: number } =>
        typeof l.priceHuf === "number" && l.priceHuf > 0
    );
    if (priced.length === 0) return null;

    const scannedIsNew =
      result.condition === "új" || result.condition === "nagyon jó";

    const matching = priced.filter((l) =>
      scannedIsNew ? listingLooksNew(l) : !listingLooksNew(l)
    );

    // Use the condition-matched subset when we have ≥ 2; otherwise fall
    // back to all priced listings so the user gets *some* range.
    const useFiltered = matching.length >= 2;
    const subset = useFiltered ? matching : priced;
    const rawPrices = subset.map((l) => l.priceHuf).sort((a, b) => a - b);

    // 1-listing case: derive a small synthetic ±10% band so we still show a
    // range (as the user explicitly requested), not a flat number.
    if (rawPrices.length === 1) {
      const p = rawPrices[0];
      return {
        q1: Math.round(p * 0.9),
        q3: Math.round(p * 1.1),
        count: 1,
        conditionTag: useFiltered ? (scannedIsNew ? "new" : "used") : "mixed",
      };
    }

    // Outlier trim: a lone mispriced listing (collector hold-out, mislabelled
    // lot, currency conversion miss) skews Q1/Q3. Drop anything beyond
    // [0.4× median, 2.5× median] once the sample is big enough that the
    // trim won't leave us with too few points to compute a band.
    const median = rawPrices[Math.floor(rawPrices.length / 2)];
    const prices =
      rawPrices.length >= 5
        ? rawPrices.filter((p) => p >= median * 0.4 && p <= median * 2.5)
        : rawPrices;

    const quantile = (q: number) => {
      const pos = (prices.length - 1) * q;
      const lo = Math.floor(pos);
      const hi = Math.ceil(pos);
      if (lo === hi) return prices[lo];
      return Math.round(prices[lo] + (prices[hi] - prices[lo]) * (pos - lo));
    };

    return {
      q1: quantile(0.25),
      q3: quantile(0.75),
      count: prices.length,
      conditionTag: useFiltered ? (scannedIsNew ? "new" : "used") : "mixed",
    };
  })();

  // Single displayed price row — replaces the old split between "Becsült
  // érték" (AI estimate) and "Piaci ár" (listings). Four scenarios:
  //
  //   1. Exact listings exist AND item is_definitely_new with retail price
  //      → max(listings median, retail × 0.875). Labelled "Piaci ár".
  //   2. Exact listings exist (any other case)
  //      → marketStats Q1-Q3. Labelled "Piaci ár".
  //   3. No exact listings AND item is_definitely_new with retail price
  //      → retail_price_huf × 0.875 ± 7.5% (≤15% spread). "Becsült piaci ár".
  //   4. No exact listings (any other case)
  //      → AI estimated_value_min/max. "Becsült piaci ár".
  type DisplayedPrice = {
    label: "market" | "estimated";
    min: number;
    max: number;
    conditionTag?: "new" | "used" | "mixed";
    count?: number;
  };
  const displayedPrice: DisplayedPrice | null = (() => {
    if (!result) return null;
    const isNew = result.is_definitely_new === true;
    const retail = result.retail_price_huf;
    const hasRetail = typeof retail === "number" && retail > 0;
    const aiMin = result.estimated_value_min_huf;
    const aiMax = result.estimated_value_max_huf;

    // Helper: derive a tight ±7.5% band around a midpoint (≤15% spread).
    const tightBand = (mid: number): { min: number; max: number } => ({
      min: Math.round(mid * 0.925),
      max: Math.round(mid * 1.075),
    });

    // Cap any band at 15% spread (min >= 0.85 × max). Anchored on the
    // upper value so the ceiling reflects the strongest market signal and
    // we shrink upward from the bottom.
    const clampSpread = (min: number, max: number): { min: number; max: number } => {
      if (max <= 0 || min >= max * 0.85) return { min, max };
      return { min: Math.round(max * 0.85), max };
    };

    if (marketStats) {
      // Scenarios 1 + 2: exact listings exist.
      if (isNew && hasRetail) {
        const listingMid = (marketStats.q1 + marketStats.q3) / 2;
        const retailSecondhand = retail * 0.875;
        const mid = Math.max(listingMid, retailSecondhand);
        const { min, max } = tightBand(mid);
        return { label: "market", min, max, conditionTag: marketStats.conditionTag, count: marketStats.count };
      }
      const { min, max } = clampSpread(marketStats.q1, marketStats.q3);
      return {
        label: "market",
        min,
        max,
        conditionTag: marketStats.conditionTag,
        count: marketStats.count,
      };
    }

    // Scenarios 3 + 4: no exact listings.
    if (isNew && hasRetail) {
      const { min, max } = tightBand(retail * 0.875);
      return { label: "estimated", min, max };
    }
    if (typeof aiMin === "number" && typeof aiMax === "number") {
      const { min, max } = clampSpread(aiMin, aiMax);
      return { label: "estimated", min, max };
    }
    return null;
  })();

  const openUpgradeConsent = () => {
    setUpgradeConsentChecked(false);
    setShowUpgradeConsent(true);
  };

  const startCheckout = async () => {
    if (!upgradeConsentChecked) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalConsent: true }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(t.error);
        setCheckoutLoading(false);
      }
    } catch {
      setError(t.error);
      setCheckoutLoading(false);
    }
  };

  const openPortal = async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    setBanner(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      const message =
        data?.error === "no_subscription"
          ? lang === "hu"
            ? "Nincs aktív Stripe előfizetésed — a fiókod manuálisan lett prémiumra állítva."
            : "No active Stripe subscription — your account was set to premium manually."
          : data?.error
            ? `${t.error} (${data.error})`
            : t.error;
      setBanner({ kind: "info", text: message });
    } catch {
      setBanner({ kind: "info", text: t.error });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-ink-100 dark:border-ink-700">
        <button
          type="button"
          onClick={reset}
          aria-label="FitFlip"
          className="flex items-baseline gap-2 hover:opacity-70 transition cursor-pointer"
        >
          <span className="text-xl font-display tracking-tight">FitFlip</span>
          <span className="text-xs text-ink-500 dark:text-ink-400 hidden sm:inline">.app</span>
        </button>
        <div className="flex items-center gap-3 text-sm">
          {/* Lang switcher: always visible on desktop; on mobile only when
              NOT authenticated (logged-in mobile users get it inside the
              hamburger menu instead). */}
          <div className={`items-center gap-1 sm:flex ${authenticated === true ? "hidden" : "flex"}`}>
            <button
              onClick={() => switchLang("hu")}
              className={`px-2 py-1 rounded transition ${
                lang === "hu" ? "bg-ink-900 text-white" : "text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white"
              }`}
              aria-label="Magyar"
            >
              HU
            </button>
            <button
              onClick={() => switchLang("en")}
              className={`px-2 py-1 rounded transition ${
                lang === "en" ? "bg-ink-900 text-white" : "text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white"
              }`}
              aria-label="English"
            >
              EN
            </button>
          </div>

          {/* Mobile-only bell, takes the lang switcher's old spot when authed. */}
          {authenticated === true && (
            <div className="sm:hidden">
              <NotificationsBell lang={lang} />
            </div>
          )}

          {authenticated === true && (
            <>
              {isPremium && (
                <span
                  className="group inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-ink-900 text-white tracking-wide cursor-default"
                  title={t.premiumActive}
                >
                  <svg
                    className="opacity-90 group-hover:rotate-180 transition-transform duration-700"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 1l2.39 7.16L22 10l-6.4 4.24L18 22l-6-4.24L6 22l2.4-7.76L2 10l7.61-1.84L12 1z" />
                  </svg>
                  <span>Premium</span>
                </span>
              )}

              <nav className="hidden sm:flex items-center gap-3">
                <NotificationsBell lang={lang} />
                <Link
                  href="/watchers"
                  className="text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition"
                >
                  {lang === "hu" ? "Követett termékeim" : "Followed items"}
                </Link>
                <Link
                  href="/history"
                  className="text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition"
                >
                  {t.history}
                </Link>
                <Link
                  href="/account"
                  className="text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition"
                >
                  {lang === "hu" ? "Fiók" : "Account"}
                </Link>
                {isPremium && (
                  <button
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition disabled:opacity-50 disabled:cursor-wait"
                  >
                    {portalLoading ? "…" : t.manageSubscription}
                  </button>
                )}
                <span
                  className="hidden md:inline text-ink-500 dark:text-ink-400 text-xs truncate max-w-[200px]"
                  title={userEmail ?? undefined}
                >
                  {userEmail}
                </span>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition"
                  >
                    {t.logout}
                  </button>
                </form>
              </nav>

              <div className="sm:hidden relative" ref={mobileMenuRef}>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  aria-label="Menu"
                  aria-expanded={mobileMenuOpen}
                  className="p-1.5 -mr-1.5 rounded-md text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 transition"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {mobileMenuOpen ? (
                      <>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </>
                    ) : (
                      <>
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                      </>
                    )}
                  </svg>
                </button>
                {mobileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-950 shadow-lg overflow-hidden z-50 fade-in">
                    {userEmail && (
                      <div className="px-4 py-3 text-xs text-ink-500 dark:text-ink-400 break-all border-b border-ink-100 dark:border-ink-700">
                        {userEmail}
                      </div>
                    )}
                    <NotificationsBell lang={lang} onMobile />
                    <Link
                      href="/watchers"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-ink-900 dark:text-ink-50 hover:bg-ink-50 dark:hover:bg-ink-800 transition"
                    >
                      {lang === "hu" ? "Követett termékeim" : "Followed items"}
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-ink-900 dark:text-ink-50 hover:bg-ink-50 dark:hover:bg-ink-800 transition"
                    >
                      {t.history}
                    </Link>
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-ink-900 dark:text-ink-50 hover:bg-ink-50 dark:hover:bg-ink-800 transition"
                    >
                      {lang === "hu" ? "Fiók" : "Account"}
                    </Link>
                    {isPremium && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openPortal();
                        }}
                        className="block w-full text-left px-4 py-3 text-sm text-ink-900 dark:text-ink-50 hover:bg-ink-50 dark:hover:bg-ink-800 transition"
                      >
                        {t.manageSubscription}
                      </button>
                    )}
                    <div className="flex items-center justify-between px-4 py-3 text-sm border-t border-ink-100 dark:border-ink-700">
                      <span className="text-ink-700 dark:text-ink-200">
                        {lang === "hu" ? "Nyelv" : "Language"}
                      </span>
                      <div className="flex items-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => switchLang("hu")}
                          className={`px-2 py-1 rounded transition ${
                            lang === "hu"
                              ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                              : "text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white"
                          }`}
                          aria-label="Magyar"
                        >
                          HU
                        </button>
                        <button
                          type="button"
                          onClick={() => switchLang("en")}
                          className={`px-2 py-1 rounded transition ${
                            lang === "en"
                              ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                              : "text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white"
                          }`}
                          aria-label="English"
                        >
                          EN
                        </button>
                      </div>
                    </div>
                    <form action="/auth/signout" method="post" className="border-t border-ink-100 dark:border-ink-700">
                      <button
                        type="submit"
                        className="block w-full text-left px-4 py-3 text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 transition"
                      >
                        {t.logout}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}
          {authenticated === false && (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-full bg-ink-900 text-white text-sm hover:bg-ink-700 transition"
            >
              {t.login}
            </Link>
          )}
        </div>
      </header>

      {banner && (
        <div className={`relative px-12 py-3 text-sm text-center ${banner.kind === "success" ? "bg-green-50 text-green-800" : "bg-ink-50 dark:bg-ink-800 text-ink-700 dark:text-ink-200"}`}>
          {banner.text}
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Close"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <section className="flex-1 flex flex-col items-center justify-start px-6 py-4 sm:py-12 max-w-2xl mx-auto w-full">
        {images.length === 0 && !result && (
          <div className="w-full text-center fade-in">
            <h1 className="text-3xl sm:text-5xl font-display tracking-tight mb-4 sm:mb-8">
              {t.tagline}
            </h1>

            {authenticated === false ? (
              <div className="border border-ink-100 dark:border-ink-700 rounded-2xl p-8 bg-ink-50 dark:bg-ink-800">
                <h2 className="text-xl font-medium mb-2">{t.loginRequired}</h2>
                <p className="text-ink-500 dark:text-ink-400 text-sm mb-5">{t.loginRequiredSub}</p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-2.5 rounded-full bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition"
                >
                  {t.login}
                </Link>
              </div>
            ) : limitReached ? (
              <div className="border border-ink-100 dark:border-ink-700 rounded-2xl p-8 bg-ink-50 dark:bg-ink-800">
                <h2 className="text-xl font-medium mb-2">{t.limitReached}</h2>
                <p className="text-ink-500 dark:text-ink-400 text-sm mb-5">{t.limitReachedSub}</p>
                <button
                  onClick={openUpgradeConsent}
                  disabled={checkoutLoading}
                  className="px-6 py-2.5 rounded-full bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition disabled:opacity-50"
                >
                  {checkoutLoading ? "…" : t.upgradeButton}
                </button>
              </div>
            ) : authenticated === true ? (
              <>
                {/* Mobile: live camera viewfinder background — tap to capture */}
                <div
                  className="sm:hidden relative aspect-[4/5] rounded-2xl overflow-hidden bg-ink-900 mb-3 cursor-pointer"
                  onClick={() => {
                    haptic("tap");
                    cameraInputRef.current?.click();
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {converting ? (
                      <div className="flex flex-col items-center gap-3 text-white">
                        <div className="w-2 h-2 bg-white dark:bg-ink-950 rounded-full pulse-slow" />
                        <p className="font-medium">
                          {lang === "hu" ? "HEIC konverzió folyamatban…" : "Converting HEIC…"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-white/80 text-sm">
                        {lang === "hu" ? "Készíts vagy válassz fotót" : "Take or pick a photo"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Desktop: drag-drop zone */}
                <div
                  onDrop={onDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="hidden sm:block border-2 border-dashed border-ink-100 dark:border-ink-700 dark:bg-ink-900 rounded-2xl p-12 hover:border-ink-300 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {converting ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-2 h-2 bg-ink-900 rounded-full pulse-slow" />
                      <p className="font-medium">
                        {lang === "hu" ? "HEIC konverzió folyamatban…" : "Converting HEIC…"}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-ink-50 dark:bg-ink-800 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">{t.uploadCta}</p>
                        <p className="text-ink-500 dark:text-ink-400 text-sm mt-1">{t.uploadHint}</p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mt-3 px-4 py-3 rounded-xl border border-ink-100 dark:border-ink-700 dark:bg-ink-900 hover:border-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 transition text-sm font-medium"
                >
                  {t.chooseFile}
                </button>

                {!isPremium && (
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-4">
                    {t.scansLeftFull.replace("{n}", scansLeft.toString())}
                  </p>
                )}
                {error && (
                  <p className="text-center text-red-600 text-sm mt-4">{error}</p>
                )}
              </>
            ) : null}

          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          onChange={onFilePick}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFilePick}
          className="hidden"
        />

        {images.length > 0 && !result && (
          <div className="w-full fade-in">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden mb-4">
              {loading && (
                <>
                  {/* Light mode: dark sweep (unchanged). */}
                  <div
                    aria-hidden
                    className="absolute inset-[-25%] ai-spin dark:hidden"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0deg, transparent 230deg, rgba(10,10,10,0.85) 340deg, transparent 360deg)",
                    }}
                  />
                  {/* Dark mode: white sweep — the dark one is invisible on a
                      near-black background. */}
                  <div
                    aria-hidden
                    className="absolute inset-[-25%] ai-spin hidden dark:block"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0deg, transparent 230deg, rgba(255,255,255,0.9) 340deg, transparent 360deg)",
                    }}
                  />
                </>
              )}
              <div
                className={`absolute rounded-[14px] overflow-hidden bg-ink-50 dark:bg-ink-800 ${loading ? "inset-[3px]" : "inset-0 rounded-2xl"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[0].preview}
                  alt="preview"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-6">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden bg-ink-50 dark:bg-ink-800 border ${idx === 0 ? "border-ink-900" : "border-ink-100 dark:border-ink-700"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt={`photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    aria-label={lang === "hu" ? "Kép eltávolítása" : "Remove photo"}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-ink-900/80 text-white flex items-center justify-center hover:bg-ink-900 transition"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && !loading && !converting && (
                <>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    aria-label={lang === "hu" ? "Még egy fotó kamerával" : "Take another photo"}
                    className="sm:hidden w-16 h-16 rounded-lg border-2 border-dashed border-ink-200 dark:border-ink-700 dark:bg-ink-900 flex items-center justify-center text-ink-500 dark:text-ink-400 hover:border-ink-400 hover:text-ink-900 dark:hover:text-white transition"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={lang === "hu" ? "Még egy fotó hozzáadása" : "Add another photo"}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-ink-200 dark:border-ink-700 dark:bg-ink-900 flex items-center justify-center text-ink-500 dark:text-ink-400 hover:border-ink-400 hover:text-ink-900 dark:hover:text-white transition"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-3">
                  <div className="w-2 h-2 bg-ink-900 rounded-full pulse-slow" />
                  <p className="font-medium">{t.analyzing}</p>
                </div>
                <p className="text-sm text-ink-500 dark:text-ink-400 mt-2">{t.analyzingSub}</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label
                    htmlFor="ff-size-input"
                    className="block text-xs font-medium text-ink-700 dark:text-ink-200 mb-1"
                  >
                    {t.sizeInputLabel}
                  </label>
                  <input
                    id="ff-size-input"
                    type="text"
                    value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                    placeholder={t.sizeInputPlaceholder}
                    maxLength={60}
                    className="w-full px-3 py-2 rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-950 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10"
                  />
                  <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1">{t.sizeInputHelp}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => analyze()}
                    className="flex-1 px-6 py-3 rounded-full bg-ink-900 text-white font-medium hover:bg-ink-700 transition"
                  >
                    {images.length > 1
                      ? lang === "hu"
                        ? `Elemzés (${images.length} kép)`
                        : `Analyze (${images.length} photos)`
                      : t.uploadCta}
                  </button>
                  <button
                    onClick={reset}
                    className="px-6 py-3 rounded-full border border-ink-100 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-800 transition text-sm"
                    aria-label={lang === "hu" ? "Mégse" : "Cancel"}
                  >
                    ✕
                  </button>
                </div>
              </>
            )}

            {error && (
              <p className="text-center text-red-600 text-sm mt-4">{error}</p>
            )}
          </div>
        )}

        {result && (
          <div className="w-full fade-in">
            {images[0] && (
              <div className="relative aspect-square w-full max-w-xs mx-auto rounded-2xl overflow-hidden bg-ink-50 dark:bg-ink-800 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[0].preview}
                  alt="scanned"
                  className="w-full h-full object-contain"
                />
                {result.hype_label && typeof result.hype_score === "number" && result.hype_score >= 7 && (
                  <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm backdrop-blur-sm ${hypeBadgeStyle(result.hype_score)}`}>
                    {result.hype_score >= 9 && <span className="mr-1">🔥</span>}
                    {result.hype_label}
                  </div>
                )}
              </div>
            )}
            {images.length > 1 && (
              <div className="flex justify-center gap-2 mb-6">
                {images.slice(1).map((img, idx) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={img.id}
                    src={img.preview}
                    alt={`scanned ${idx + 2}`}
                    className="w-12 h-12 rounded-md object-cover bg-ink-50 dark:bg-ink-800 border border-ink-100 dark:border-ink-700"
                  />
                ))}
              </div>
            )}

            {!result.recognized ? (
              <div className="text-center border border-ink-100 dark:border-ink-700 rounded-2xl p-8">
                <p className="font-medium mb-2">{t.notRecognized}</p>
                <button
                  onClick={reset}
                  className="mt-4 px-6 py-2 rounded-full bg-ink-900 text-white text-sm hover:bg-ink-700 transition"
                >
                  {t.newScan}
                </button>
              </div>
            ) : (
              <>
                <div className="border border-ink-100 dark:border-ink-700 rounded-2xl overflow-hidden">
                  <div className="px-6 py-5 border-b border-ink-100 dark:border-ink-700">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-medium">
                          {result.brand} {result.model && <span className="text-ink-500 dark:text-ink-400">— {result.model}</span>}
                        </h2>
                        {result.era && (
                          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">{result.era}</p>
                        )}
                      </div>
                      {result.confidence && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          result.confidence === "high"
                            ? "bg-green-50 text-green-800"
                            : result.confidence === "medium"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                            : "bg-ink-50 dark:bg-ink-800 text-ink-500 dark:text-ink-400"
                        }`}>
                          {result.confidence === "high" ? t.confidenceHigh : result.confidence === "medium" ? t.confidenceMedium : t.confidenceLow}
                        </span>
                      )}
                    </div>
                  </div>

                  <dl className="divide-y divide-ink-100">
                    {result.condition && (
                      <div className="flex justify-between px-6 py-3 text-sm">
                        <dt className="text-ink-500 dark:text-ink-400">{t.condition}</dt>
                        <dd className="font-medium">{result.condition}</dd>
                      </div>
                    )}
                    {displayedPrice && (
                      <div className="flex justify-between px-6 py-3 text-sm">
                        <dt className="text-ink-500 dark:text-ink-400">
                          {displayedPrice.label === "market" ? t.marketRangeLabel : t.estimatedMarketLabel}
                        </dt>
                        <dd className="font-medium text-right">
                          <div>
                            {displayedPrice.min === displayedPrice.max
                              ? formatHuf(displayedPrice.min)
                              : `${formatHuf(displayedPrice.min)} – ${formatHuf(displayedPrice.max)}`}
                          </div>
                          {typeof result.condition_discount_pct === "number" &&
                            result.condition_discount_pct > 0 &&
                            result.is_definitely_new !== true && (
                              <div className="text-[11px] font-normal text-ink-500 dark:text-ink-400 mt-0.5">
                                {t.estimatedValueDiscountNote.replace("{n}", String(result.condition_discount_pct))}
                              </div>
                            )}
                          {displayedPrice.count !== undefined && displayedPrice.conditionTag && (
                            <div className="text-[11px] font-normal text-ink-500 dark:text-ink-400 mt-0.5">
                              {(displayedPrice.conditionTag === "new"
                                ? t.marketRangeSubNew
                                : displayedPrice.conditionTag === "used"
                                  ? t.marketRangeSubUsed
                                  : t.marketRangeSub
                              ).replace("{n}", String(displayedPrice.count))}
                            </div>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {displayedPrice && displayedPrice.max >= 100000 && (
                    <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-100 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 mt-0.5">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <div>
                        <strong>{t.authenticityWarningTitle}:</strong> {t.authenticityWarningText}
                      </div>
                    </div>
                  )}

                  {Array.isArray(result.defects) && result.defects.length > 0 && (
                    <div className="px-6 py-4 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-100 text-sm text-amber-900 dark:text-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span className="font-medium">{t.defectsTitle}</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
                        {result.defects.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                      {typeof result.condition_discount_pct === "number" && result.condition_discount_pct > 0 && (
                        <p className="text-[12px] text-amber-700 mt-3">
                          {t.defectsImpactNote.replace("{n}", String(result.condition_discount_pct))}
                        </p>
                      )}
                    </div>
                  )}

                  {result.description && (
                    <div className="px-6 py-4 bg-ink-50 dark:bg-ink-800 text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
                      {result.description}
                    </div>
                  )}

                  {result.story && result.story.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        haptic("tap");
                        setShowStory(true);
                      }}
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-500 dark:text-ink-400 group-hover:text-ink-900 dark:hover:text-white transition" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  )}

                  {result.scan_id && lastSearchParams && (
                    <WatcherWidget
                      scanId={result.scan_id}
                      isPremium={isPremium}
                      lang={lang}
                      suggestedPriceHuf={
                        displayedPrice?.min ??
                        result.estimated_value_min_huf ??
                        50000
                      }
                      maxPriceHuf={Math.round(
                        (displayedPrice?.max ??
                          result.estimated_value_max_huf ??
                          100000) * 1.5
                      )}
                      baselineUrls={(listings ?? []).map((l) => l.url)}
                      search={lastSearchParams}
                    />
                  )}
                </div>

                <div className="mt-6">
                  <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-3">
                    {t.listingsTitle}
                  </p>
                    {(!result.brand?.trim() || result.confidence === "low") && !refinementDismissed && (
                      <div className="border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-5 bg-amber-50 dark:bg-amber-950/40 mb-4">
                        <div className="flex items-start gap-2.5 mb-3">
                          <div className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">{t.refineTitle}</p>
                            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">{t.refineSub}</p>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={refinementText}
                          onChange={(e) => setRefinementText(e.target.value)}
                          placeholder={t.refinePlaceholder}
                          disabled={refinementLoading}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && refinementText.trim()) {
                              submitRefinement();
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-950 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10 disabled:opacity-60"
                        />
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <button
                            type="button"
                            onClick={submitRefinement}
                            disabled={refinementLoading || refinementText.trim().length === 0}
                            className="px-4 py-2 rounded-full bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {refinementLoading ? "…" : t.refineSubmit}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRefinementDismissed(true)}
                            disabled={refinementLoading}
                            className="text-xs text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition disabled:opacity-50"
                          >
                            {t.refineSkip}
                          </button>
                        </div>
                      </div>
                    )}
                    {listingsLoading ? (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-busy="true" aria-label={t.listingsLoading}>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <li key={i} className="border border-ink-100 dark:border-ink-700 rounded-2xl overflow-hidden bg-white dark:bg-ink-950">
                            <div className="flex gap-3 p-3">
                              <div className="w-20 h-20 rounded-lg bg-ink-100 shrink-0 pulse-slow" />
                              <div className="flex-1 min-w-0 space-y-2 py-1">
                                <div className="h-3 w-4/5 rounded bg-ink-100 pulse-slow" />
                                <div className="h-3 w-2/5 rounded bg-ink-100 pulse-slow" />
                                <div className="h-2.5 w-3/5 rounded bg-ink-100 pulse-slow" />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : displayedListings && displayedListings.length > 0 ? (
                      <>
                        {(!result.brand?.trim() || !listingsExact) && (
                          <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 text-sky-900 dark:text-sky-200">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <p className="text-xs leading-snug">
                              <strong className="font-semibold">
                                {lang === "hu" ? "Hasonló találatok" : "Similar matches"}
                              </strong>
                              {" — "}
                              {!result.brand?.trim()
                                ? lang === "hu"
                                  ? "nem találtunk pontos egyezést, mert a márka bizonytalan. Az alábbi hirdetések vizuálisan vagy kategóriában hasonlóak."
                                  : "no exact match — brand is uncertain. The listings below are visually or categorically similar."
                                : lang === "hu"
                                  ? "ebben a pontos modell/colorway-ben nincs aktuális hirdetés. Az alábbiak kapcsolódó találatok."
                                  : "no listings for this exact model/colorway. The ones below are related matches."}
                            </p>
                          </div>
                        )}
                        {sizeTokens.length > 0 && (() => {
                          const matchCount = displayedListings.filter((e) => e.match).length;
                          if (matchCount >= 2) return null;
                          const msg = matchCount === 0 ? t.sizeRareWarningZero : t.sizeRareWarningOne;
                          return (
                            <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden="true">
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                              <p className="text-xs leading-snug">{msg}</p>
                            </div>
                          );
                        })()}
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {displayedListings.map(({ listing: l, match: matched }, idx) => (
                          <li key={`${l.source}-${idx}`} className={`border rounded-2xl overflow-hidden bg-white dark:bg-ink-950 hover:border-ink-300 transition ${matched ? "border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-200" : "border-ink-100 dark:border-ink-700"}`}>
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
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <p className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-ink-400">
                                    {l.source === "vinted"
                                      ? "Vinted"
                                      : l.source === "jofogas"
                                        ? "Jófogás"
                                        : l.source === "ebay"
                                          ? "eBay"
                                          : (l.source as string)}
                                    {l.location ? ` · ${l.location}` : ""}
                                  </p>
                                  {matched && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                      {t.sizeMatchBadge}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </a>
                          </li>
                        ))}
                        </ul>
                      </>
                    ) : (
                      <div className="border border-ink-100 dark:border-ink-700 rounded-2xl p-8 bg-ink-50 dark:bg-ink-800 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white dark:bg-ink-950 border border-ink-100 dark:border-ink-700 flex items-center justify-center text-ink-400 dark:text-ink-500">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                          </svg>
                        </div>
                        <p className="text-sm text-ink-700 dark:text-ink-200 font-medium">{t.listingsEmpty}</p>
                      </div>
                    )}
                </div>

                {result.selling_tip && (
                  <div className="mt-4 border border-ink-100 dark:border-ink-700 rounded-2xl p-6 bg-ink-50 dark:bg-ink-800">
                    <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-2">
                      {t.sellingTipTitle}
                    </p>
                    <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
                      {result.selling_tip}
                    </p>
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={reset}
                    className="px-6 py-3 rounded-full bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition"
                  >
                    {t.newScan}
                  </button>
                  {!isPremium && (
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-3">
                      {t.scansLeftFull.replace("{n}", result.scansLeft.toString())}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {showUpgradeConsent && (
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
                checked={upgradeConsentChecked}
                onChange={(e) => setUpgradeConsentChecked(e.target.checked)}
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
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowUpgradeConsent(false)}
                disabled={checkoutLoading}
                className="px-4 py-2 rounded-full border border-ink-200 dark:border-ink-700 text-sm hover:bg-ink-50 dark:hover:bg-ink-800 transition disabled:opacity-50"
              >
                {lang === "hu" ? "Mégse" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={startCheckout}
                disabled={!upgradeConsentChecked || checkoutLoading}
                className="px-4 py-2 rounded-full bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
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

      {result?.story && (
        <StoryModal
          open={showStory}
          onClose={() => setShowStory(false)}
          title={`${result.brand ?? ""}${result.model ? ` — ${result.model}` : ""}`.trim() || (lang === "hu" ? "Sztori" : "Story")}
          story={result.story}
          lang={lang}
        />
      )}
      {displayedListings && displayedListings.length >= 6 && (
        <BackToTop lang={lang} />
      )}

      <footer className="px-6 py-3 sm:py-6 border-t border-ink-100 dark:border-ink-700 text-center text-[11px] sm:text-xs text-ink-500 dark:text-ink-400 space-y-1 sm:space-y-2">
        <p>{t.footer}</p>
        <LegalFooter />
      </footer>
    </main>
  );
}
