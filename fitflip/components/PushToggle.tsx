"use client";

import { useEffect, useState } from "react";
import { translations } from "@/lib/translations";
import { pushSupported, pushPermission, enablePush, disablePush } from "@/lib/push";
import PushPrimer from "@/components/PushPrimer";
import type { Lang } from "@/lib/lang";

/**
 * Notification switch in account settings.
 *
 * Renders nothing in a browser: push here is a native capability, and a
 * switch that can only ever fail is worse than no switch. It also reflects an
 * OS-level denial explicitly — flipping back to off with no explanation
 * looks like our bug, when the user has to go to Settings to undo it.
 */
export default function PushToggle({ lang }: { lang: Lang }) {
  const t = lang === "hu" ? translations.hu : translations.en;
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [primerOpen, setPrimerOpen] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    setSupported(true);

    // The server knows whether a token is registered; the OS knows whether
    // it is still allowed to deliver. Both have to be true for the switch to
    // read "on", or a user who revoked permission in Settings would see a
    // green switch and wonder why nothing arrives.
    void (async () => {
      const [perm, res] = await Promise.all([
        pushPermission(),
        fetch("/api/push/register")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      setBlocked(perm === "denied");
      setEnabled(perm === "granted" && res?.enabled === true);
    })();
  }, []);

  const toggle = async () => {
    if (enabled === null || saving) return;
    // Turning it ON goes through the primer first — the OS dialog is a
    // one-shot, and it should not be spent on a tap the user hasn't been
    // given the information to make. Turning it OFF is immediate: making
    // someone argue with a dialog to stop receiving things is the wrong way
    // round.
    if (!enabled) {
      setPrimerOpen(true);
      return;
    }
    setSaving(true);
    try {
      if (await disablePush()) setEnabled(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmEnable = async () => {
    setPrimerOpen(false);
    setSaving(true);
    try {
      const ok = await enablePush();
      setEnabled(ok);
      if (!ok) setBlocked((await pushPermission()) === "denied");
    } finally {
      setSaving(false);
    }
  };

  if (!supported || enabled === null) return null;

  return (
    <div className="p-4 rounded-2xl bg-ink-50 dark:bg-ink-800 border border-ink-100 dark:border-ink-700">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t.pushTitle}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {saving ? t.pushSaving : enabled ? t.pushOn : t.pushOff}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t.pushTitle}
          onClick={toggle}
          disabled={saving}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            enabled ? "bg-ink-900 dark:bg-white" : "bg-ink-300 dark:bg-ink-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white dark:bg-ink-900 shadow transition-transform ${
              enabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-500 dark:text-ink-400 leading-relaxed">
        {blocked && !enabled ? t.pushBlocked : t.pushHint}
      </p>

      {primerOpen && (
        <PushPrimer
          lang={lang}
          blocked={blocked}
          onConfirm={confirmEnable}
          onClose={() => setPrimerOpen(false)}
        />
      )}
    </div>
  );
}
