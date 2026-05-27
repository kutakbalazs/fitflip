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
}
