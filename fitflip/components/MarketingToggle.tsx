"use client";

import { useEffect, useState } from "react";
import { translations } from "@/lib/translations";
import type { Lang } from "@/lib/lang";

/**
 * Newsletter opt-in/out in account settings.
 *
 * Consent given at signup has to be as easy to withdraw as it was to give, so
 * this is a plain switch rather than anything that asks the user to confirm
 * or explain themselves. Emails also carry a one-click unsubscribe link for
 * people who don't want to sign in at all.
 */
export default function MarketingToggle({ lang }: { lang: Lang }) {
  const t = lang === "hu" ? translations.hu : translations.en;
  const [consent, setConsent] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/marketing/consent")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setConsent(d?.consent === true))
      .catch(() => setConsent(false));
  }, []);

  const toggle = async () => {
    if (consent === null || saving) return;
    const next = !consent;
    setSaving(true);
    // Optimistic: the switch should feel instant, and a failure just puts it
    // back where it was.
    setConsent(next);
    try {
      const res = await fetch("/api/marketing/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: next }),
      });
      if (!res.ok) setConsent(!next);
    } catch {
      setConsent(!next);
    } finally {
      setSaving(false);
    }
  };

  if (consent === null) return null;

  return (
    <div className="p-4 rounded-2xl bg-ink-50 dark:bg-ink-800 border border-ink-100 dark:border-ink-700">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t.marketingTitle}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {saving ? t.marketingSaving : consent ? t.marketingOn : t.marketingOff}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={consent}
          aria-label={t.marketingTitle}
          onClick={toggle}
          disabled={saving}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            consent ? "bg-ink-900 dark:bg-white" : "bg-ink-300 dark:bg-ink-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white dark:bg-ink-900 shadow transition-transform ${
              consent ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-500 dark:text-ink-400 leading-relaxed">
        {t.marketingOptInHint}
      </p>
    </div>
  );
}
