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
