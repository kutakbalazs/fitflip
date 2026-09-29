"use client";

import { useEffect, useState } from "react";
import { translations } from "@/lib/translations";
import { pushSupported, pushPermission, enablePush, disablePush } from "@/lib/push";
import { isNativePlatform } from "@/lib/native";
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
  const [onNative, setOnNative] = useState(false);
  // Native, but this build has no push plugin — an install older than the
  // release that added it. Worth saying out loud: the row used to vanish
  // here, which reads as a missing feature rather than an old app.
  const [unavailable, setUnavailable] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  // TEMPORARY diagnostic — see enablePush(onStep).
  const [step, setStep] = useState<string | null>(null);

  useEffect(() => {
    if (!isNativePlatform()) return; // no push on the web at all
    setOnNative(true);
    if (!pushSupported()) {
      setUnavailable(true);
      return;
    }

    // The server knows whether a token is registered; the OS knows whether
    // it is still allowed to deliver. Both have to be true for the switch to
    // read "on", or a user who revoked permission in Settings would see a
    // green switch and wonder why nothing arrives.
    void (async () => {
      // Neither of these is supposed to hang, and one of them did: the row
      // sat on "Betöltés…" forever on a device. A switch that can never
      // resolve is worse than one that guesses wrong — the user can always
      // tap a wrong guess, but they can't tap a spinner. So: bounded wait,
      // then fall through to "off", which is both the safe default and the
      // state a tap can correct.
      const withTimeout = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 5000)),
        ]);

      const [perm, res] = await Promise.all([
        withTimeout(pushPermission(), "prompt" as const),
        withTimeout(
          fetch("/api/push/register")
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          null
        ),
      ]);
      setBlocked(perm === "denied");
      setEnabled(perm === "granted" && res?.enabled === true);
    })();
  }, []);

  const toggle = async () => {
    if (enabled === null || saving) return;
    // A switch in settings is a switch: it does the thing. The explanation
    // belongs where someone meets the feature for the first time, not in
    // front of a control they deliberately went looking for.
    setSaving(true);
    try {
      if (enabled) {
        if (await disablePush()) setEnabled(false);
        return;
      }
      const ok = await enablePush(setStep);
      setEnabled(ok);
      if (!ok) setBlocked((await pushPermission()) === "denied");
    } finally {
      setSaving(false);
    }
  };

  if (!onNative) return null;

  return (
    <div className="p-4 rounded-2xl bg-ink-50 dark:bg-ink-800 border border-ink-100 dark:border-ink-700">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t.pushTitle}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {unavailable
              ? t.pushUnavailable
              : enabled === null
                ? t.pushLoading
                : saving
                  ? t.pushSaving
                  : enabled
                    ? t.pushOn
                    : t.pushOff}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled === true}
          aria-label={t.pushTitle}
          onClick={toggle}
          disabled={saving || unavailable || enabled === null}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            enabled ? "bg-ink-900 dark:bg-white" : "bg-ink-300 dark:bg-ink-500"
          }`}
        >
          <span
            className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "dark:bg-ink-900" : "dark:bg-ink-100"
            } ${
              enabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-500 dark:text-ink-400 leading-relaxed">
        {step ?? (unavailable ? t.pushUnavailable : blocked && !enabled ? t.pushBlocked : t.pushHint)}
      </p>

    </div>
  );
}
