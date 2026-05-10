"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { translations, type Lang } from "@/lib/translations";
import { createClient } from "@/lib/supabase/client";

type AnalysisResult = {
  recognized: boolean;
  category: string | null;
  brand: string | null;
  model: string | null;
  era: string | null;
  condition: string | null;
  estimated_value_min_huf: number | null;
  estimated_value_max_huf: number | null;
  description: string | null;
  search_query: string | null;
  selling_tip: string | null;
  confidence: "low" | "medium" | "high" | null;
  scansLeft: number;
};

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
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  useEffect(() => {
    const stored = localStorage.getItem("ff_lang");
    if (stored === "hu" || stored === "en") setLang(stored);

    supabase.auth.getUser().then(({ data }) => {
      setAuthenticated(!!data.user);
      setUserEmail(data.user?.email ?? null);
      if (data.user) {
        const currentLang = (localStorage.getItem("ff_lang") as Lang | null) ?? "hu";
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
      const isHu = (localStorage.getItem("ff_lang") ?? "hu") === "hu";
      setBanner({ kind: "success", text: isHu ? "Sikeres előfizetés! Mostantól korlátlan a használat." : "Subscription successful! You now have unlimited use." });
      window.history.replaceState({}, "", "/");
    } else if (params.get("upgrade") === "cancel") {
      const isHu = (localStorage.getItem("ff_lang") ?? "hu") === "hu";
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
    if (imagePreview || result || limitReached) return;

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
  }, [authenticated, imagePreview, result, limitReached]);

  const switchLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("ff_lang", newLang);
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
          setImageData(base64);
          setImageMediaType("image/jpeg");
          setImagePreview(result);
        };
        reader.readAsDataURL(compressed);
      } catch {
        setError(lang === "hu" ? "Nem sikerült feldolgozni a képet." : "Couldn't process the image.");
      }
    },
    [lang]
  );

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

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

  const analyze = async () => {
    if (!imageData || !imageMediaType) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, mediaType: imageMediaType, lang }),
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
      if (typeof data.scansLeft === "number") {
        setScansLeft(data.scansLeft);
        if (data.scansLeft <= 0) setLimitReached(true);
      }
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImageData(null);
    setImageMediaType(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
  };

  const formatHuf = (n: number | null) => {
    if (n === null) return "—";
    return new Intl.NumberFormat("hu-HU").format(n) + " Ft";
  };

  const startCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
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
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError(t.error);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-ink-100">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-medium tracking-tight">FitFlip</span>
          <span className="text-xs text-ink-500 hidden sm:inline">.app</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <button
              onClick={() => switchLang("hu")}
              className={`px-2 py-1 rounded transition ${
                lang === "hu" ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900"
              }`}
              aria-label="Magyar"
            >
              HU
            </button>
            <button
              onClick={() => switchLang("en")}
              className={`px-2 py-1 rounded transition ${
                lang === "en" ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900"
              }`}
              aria-label="English"
            >
              EN
            </button>
          </div>

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
                <Link
                  href="/history"
                  className="text-ink-500 hover:text-ink-900 transition"
                >
                  {t.history}
                </Link>
                {isPremium && (
                  <button
                    onClick={openPortal}
                    className="text-ink-500 hover:text-ink-900 transition"
                  >
                    {t.manageSubscription}
                  </button>
                )}
                <span className="hidden md:inline text-ink-500 text-xs truncate max-w-[140px]">
                  {userEmail}
                </span>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-ink-500 hover:text-ink-900 transition"
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
                  className="p-1.5 -mr-1.5 rounded-md text-ink-700 hover:bg-ink-50 transition"
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
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-ink-100 bg-white shadow-lg overflow-hidden z-50 fade-in">
                    {userEmail && (
                      <div className="px-4 py-3 text-xs text-ink-500 truncate border-b border-ink-100">
                        {userEmail}
                      </div>
                    )}
                    <Link
                      href="/history"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-ink-900 hover:bg-ink-50 transition"
                    >
                      {t.history}
                    </Link>
                    {isPremium && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openPortal();
                        }}
                        className="block w-full text-left px-4 py-3 text-sm text-ink-900 hover:bg-ink-50 transition"
                      >
                        {t.manageSubscription}
                      </button>
                    )}
                    <form action="/auth/signout" method="post" className="border-t border-ink-100">
                      <button
                        type="submit"
                        className="block w-full text-left px-4 py-3 text-sm text-ink-700 hover:bg-ink-50 transition"
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
        <div className={`relative px-12 py-3 text-sm text-center ${banner.kind === "success" ? "bg-green-50 text-green-800" : "bg-ink-50 text-ink-700"}`}>
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

      <section className="flex-1 flex flex-col items-center justify-start px-6 py-12 max-w-2xl mx-auto w-full">
        {!imagePreview && !result && (
          <div className="w-full text-center fade-in">
            <h1 className="text-4xl sm:text-5xl font-display tracking-tight mb-3">
              {t.tagline}
            </h1>
            <p className="text-ink-500 text-lg mb-10">{t.subtagline}</p>

            {authenticated === false ? (
              <div className="border border-ink-100 rounded-2xl p-8 bg-ink-50">
                <h2 className="text-xl font-medium mb-2">{t.loginRequired}</h2>
                <p className="text-ink-500 text-sm mb-5">{t.loginRequiredSub}</p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-2.5 rounded-full bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition"
                >
                  {t.login}
                </Link>
              </div>
            ) : limitReached ? (
              <div className="border border-ink-100 rounded-2xl p-8 bg-ink-50">
                <h2 className="text-xl font-medium mb-2">{t.limitReached}</h2>
                <p className="text-ink-500 text-sm mb-5">{t.limitReachedSub}</p>
                <button
                  onClick={startCheckout}
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
                  className="sm:hidden relative aspect-[3/4] rounded-2xl overflow-hidden bg-ink-900 mb-4 cursor-pointer"
                  onClick={() => cameraInputRef.current?.click()}
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
                        <div className="w-2 h-2 bg-white rounded-full pulse-slow" />
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
                  className="hidden sm:block border-2 border-dashed border-ink-100 rounded-2xl p-12 hover:border-ink-300 transition-colors cursor-pointer"
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
                      <div className="w-12 h-12 rounded-full bg-ink-50 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">{t.uploadCta}</p>
                        <p className="text-ink-500 text-sm mt-1">{t.uploadHint}</p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mt-4 px-4 py-3 rounded-xl border border-ink-100 hover:border-ink-300 hover:bg-ink-50 transition text-sm font-medium"
                >
                  {t.chooseFile}
                </button>

                {!isPremium && (
                  <p className="text-xs text-ink-500 mt-6">
                    {t.scansLeftFull.replace("{n}", scansLeft.toString())}
                  </p>
                )}
                {error && (
                  <p className="text-center text-red-600 text-sm mt-4">{error}</p>
                )}
              </>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
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
          </div>
        )}

        {imagePreview && !result && (
          <div className="w-full fade-in">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-ink-50 mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="preview"
                className="w-full h-full object-contain"
              />
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-3">
                  <div className="w-2 h-2 bg-ink-900 rounded-full pulse-slow" />
                  <p className="font-medium">{t.analyzing}</p>
                </div>
                <p className="text-sm text-ink-500 mt-2">{t.analyzingSub}</p>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={analyze}
                  className="flex-1 px-6 py-3 rounded-full bg-ink-900 text-white font-medium hover:bg-ink-700 transition"
                >
                  {t.uploadCta}
                </button>
                <button
                  onClick={reset}
                  className="px-6 py-3 rounded-full border border-ink-100 hover:bg-ink-50 transition text-sm"
                >
                  ✕
                </button>
              </div>
            )}

            {error && (
              <p className="text-center text-red-600 text-sm mt-4">{error}</p>
            )}
          </div>
        )}

        {result && (
          <div className="w-full fade-in">
            <div className="aspect-square w-full max-w-xs mx-auto rounded-2xl overflow-hidden bg-ink-50 mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview!}
                alt="scanned"
                className="w-full h-full object-contain"
              />
            </div>

            {!result.recognized ? (
              <div className="text-center border border-ink-100 rounded-2xl p-8">
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
                <div className="border border-ink-100 rounded-2xl overflow-hidden">
                  <div className="px-6 py-5 border-b border-ink-100">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-medium">
                          {result.brand} {result.model && <span className="text-ink-500">— {result.model}</span>}
                        </h2>
                        {result.era && (
                          <p className="text-sm text-ink-500 mt-1">{result.era}</p>
                        )}
                      </div>
                      {result.confidence && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          result.confidence === "high"
                            ? "bg-green-50 text-green-800"
                            : result.confidence === "medium"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-ink-50 text-ink-500"
                        }`}>
                          {result.confidence === "high" ? t.confidenceHigh : result.confidence === "medium" ? t.confidenceMedium : t.confidenceLow}
                        </span>
                      )}
                    </div>
                  </div>

                  <dl className="divide-y divide-ink-100">
                    {result.condition && (
                      <div className="flex justify-between px-6 py-3 text-sm">
                        <dt className="text-ink-500">{t.condition}</dt>
                        <dd className="font-medium">{result.condition}</dd>
                      </div>
                    )}
                    <div className="flex justify-between px-6 py-3 text-sm">
                      <dt className="text-ink-500">{t.estimatedValue}</dt>
                      <dd className="font-medium">
                        {formatHuf(result.estimated_value_min_huf)} – {formatHuf(result.estimated_value_max_huf)}
                      </dd>
                    </div>
                  </dl>

                  {result.description && (
                    <div className="px-6 py-4 bg-ink-50 text-sm text-ink-700 leading-relaxed">
                      {result.description}
                    </div>
                  )}
                </div>

                <div className="mt-6 border border-ink-100 rounded-2xl p-6 bg-ink-50 relative overflow-hidden">
                  <div className="opacity-60">
                    <p className="text-xs uppercase tracking-wider text-ink-500 mb-2">
                      {t.listingsTitle}
                    </p>
                    <p className="font-medium">{t.listingsLocked}</p>
                    <p className="text-sm text-ink-500 mt-1">{t.listingsLockedSub}</p>
                  </div>
                  <button
                    onClick={startCheckout}
                    disabled={checkoutLoading || isPremium}
                    className="mt-4 px-5 py-2 rounded-full bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition disabled:opacity-50"
                  >
                    {isPremium ? t.premiumActive : checkoutLoading ? "…" : t.upgradeButton}
                  </button>
                </div>

                {result.selling_tip && (
                  <div className="mt-4 border border-ink-100 rounded-2xl p-6 bg-ink-50">
                    <p className="text-xs uppercase tracking-wider text-ink-500 mb-2">
                      {t.sellingTipTitle}
                    </p>
                    <p className="text-sm text-ink-700 leading-relaxed">
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
                    <p className="text-xs text-ink-500 mt-3">
                      {t.scansLeftFull.replace("{n}", result.scansLeft.toString())}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <footer className="px-6 py-6 border-t border-ink-100 text-center text-xs text-ink-500">
        {t.footer}
      </footer>
    </main>
  );
}
