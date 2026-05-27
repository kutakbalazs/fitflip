"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  writeThemePreference,
  type ThemePreference,
} from "@/lib/theme";

type Ctx = {
  pref: ThemePreference;
  resolved: "light" | "dark";
  setPref: (p: ThemePreference) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Initial read + apply on mount.
  useEffect(() => {
    const initial = readThemePreference();
    setPrefState(initial);
    applyTheme(initial);
    setResolved(resolveTheme(initial));
  }, []);

  // React to OS-level changes while user is on "system".
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyTheme("system");
      setResolved(resolveTheme("system"));
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [pref]);

  const setPref = useCallback((p: ThemePreference) => {
    writeThemePreference(p);
    setPrefState(p);
    applyTheme(p);
    setResolved(resolveTheme(p));
  }, []);

  return (
    <ThemeContext.Provider value={{ pref, resolved, setPref }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      pref: "system",
      resolved: "light",
      setPref: () => {},
    };
  }
  return ctx;
}
