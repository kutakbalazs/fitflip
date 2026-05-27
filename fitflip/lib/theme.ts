export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "ff-theme";

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

export function writeThemePreference(pref: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}

export function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(pref: ThemePreference): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = resolved;
}

/**
 * Inline script string injected into <head> to apply the theme BEFORE
 * React hydrates — prevents a flash of unstyled content (FOUC) on dark
 * mode users.
 */
export const themeInitScript = `
(function(){try{
  var pref = localStorage.getItem("ff-theme") || "system";
  var dark = pref === "dark" || (pref === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  var root = document.documentElement;
  if (dark) root.classList.add("dark");
  root.style.colorScheme = dark ? "dark" : "light";
}catch(e){}})();
`;
