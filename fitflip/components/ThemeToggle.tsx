"use client";

import { useTheme } from "./ThemeProvider";
import type { ThemePreference } from "@/lib/theme";

type Props = {
  lang: "hu" | "en";
};

export default function ThemeToggle({ lang }: Props) {
  const { pref, setPref } = useTheme();

  const t =
    lang === "hu"
      ? {
          title: "Megjelenés",
          sub: "A „Rendszer” a telefonod beállítását követi (auto-sötét napnyugtakor).",
          system: "Rendszer",
          light: "Világos",
          dark: "Sötét",
        }
      : {
          title: "Appearance",
          sub: "“System” follows your phone setting (auto-dark at sunset).",
          system: "System",
          light: "Light",
          dark: "Dark",
        };

  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: "system", label: t.system, icon: <SystemIcon /> },
    { value: "light", label: t.light, icon: <SunIcon /> },
    { value: "dark", label: t.dark, icon: <MoonIcon /> },
  ];

  return (
    <div>
      <p className="text-xs text-ink-500 dark:text-ink-400 uppercase tracking-wider mb-2">
        {t.title}
      </p>
      <div className="inline-flex rounded-full border border-ink-100 dark:border-ink-800 p-1 bg-white dark:bg-ink-900">
        {options.map((opt) => {
          const active = pref === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPref(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                active
                  ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                  : "text-ink-500 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white"
              }`}
              aria-pressed={active}
            >
              <span className="w-3.5 h-3.5">{opt.icon}</span>
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-2 leading-relaxed">{t.sub}</p>
    </div>
  );
}

function SystemIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
