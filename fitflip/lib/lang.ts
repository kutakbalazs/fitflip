export type Lang = "hu" | "en";

/**
 * Canonical language storage. Reads BOTH "ff-lang" and "ff_lang" for
 * backwards compatibility with the inconsistent keys that existed across
 * components. Writers update both keys so any reader picks up the change.
 */
export function readLang(): Lang {
  if (typeof window === "undefined") return "hu";
  try {
    const v = localStorage.getItem("ff-lang") ?? localStorage.getItem("ff_lang");
    return v === "en" ? "en" : "hu";
  } catch {
    return "hu";
  }
}

/** True if the user (or a previous auto-detect) already has a stored choice. */
export function hasStoredLang(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!(localStorage.getItem("ff-lang") ?? localStorage.getItem("ff_lang"));
  } catch {
    return false;
  }
}

/**
 * Language implied by the device settings, used ONLY on first run when the
 * user has no stored preference. The app ships Hungarian and English, so any
 * non-Hungarian device language maps to English. Falls back to Hungarian when
 * the device tells us nothing (primary market).
 */
export function deviceLang(): Lang {
  if (typeof navigator === "undefined") return "hu";
  try {
    const list =
      navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language];
    const tags = list.filter(Boolean).map((l) => l.toLowerCase());
    if (tags.length === 0) return "hu";
    return tags.some((t) => t.startsWith("hu")) ? "hu" : "en";
  } catch {
    return "hu";
  }
}

export function writeLang(l: Lang): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("ff-lang", l);
    localStorage.setItem("ff_lang", l);
  } catch {
    /* ignore */
  }
  // Notify mounted components (footer, cookie banner, …) so the whole page
  // switches language live, not only after a reload.
  try {
    window.dispatchEvent(new CustomEvent("ff-lang-changed", { detail: { lang: l } }));
  } catch {
    /* ignore */
  }
}

/** Subscribe to live language changes; returns the unsubscribe function. */
export function onLangChange(cb: (l: Lang) => void): () => void {
  const handler = (e: Event) => {
    cb((e as CustomEvent).detail?.lang === "en" ? "en" : "hu");
  };
  window.addEventListener("ff-lang-changed", handler);
  return () => window.removeEventListener("ff-lang-changed", handler);
}
