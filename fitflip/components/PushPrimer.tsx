"use client";

import { translations } from "@/lib/translations";
import type { Lang } from "@/lib/lang";

/**
 * Shown before the OS permission dialog, never after.
 *
 * The system prompt appears exactly once in the lifetime of an install. A
 * user who taps "Don't allow" because they don't yet know what they'd be
 * getting cannot be asked again from inside the app — they'd have to find it
 * in Settings, which in practice means never. So the real choice happens
 * here, where we can answer "what will you send me?" before the one-shot
 * question is spent, and where "Not now" costs nothing.
 *
 * It also states what we will never send. That is the part people actually
 * worry about, and it is a promise the code keeps: the only two senders are
 * the watcher cron and the monthly wardrobe digest.
 */
export default function PushPrimer({
  lang,
  blocked,
  onConfirm,
  onClose,
}: {
  lang: Lang;
  /** OS-level permission is already denied; there is nothing to ask for. */
  blocked: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = lang === "hu" ? translations.hu : translations.en;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-primer-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-3xl sm:rounded-3xl border border-ink-100 dark:border-ink-700 p-6 safe-pb-5 sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {blocked ? (
          <>
            <h2 id="push-primer-title" className="text-lg font-semibold mb-2">
              {t.pushPrimerDeniedTitle}
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 leading-relaxed mb-6">
              {t.pushPrimerDeniedBody}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 text-sm font-semibold"
            >
              {t.pushPrimerClose}
            </button>
          </>
        ) : (
          <>
            <h2 id="push-primer-title" className="text-lg font-semibold mb-1">
              {t.pushPrimerTitle}
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-5">{t.pushPrimerLead}</p>

            <ul className="space-y-3 mb-5">
              {[t.pushPrimerGet1, t.pushPrimerGet2].map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-relaxed">
                  <span aria-hidden="true" className="text-ink-400 dark:text-ink-500">
                    •
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl bg-ink-50 dark:bg-ink-800 p-4 mb-5">
              <p className="text-xs font-semibold mb-1">{t.pushPrimerNeverTitle}</p>
              <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">
                {t.pushPrimerNever}
              </p>
            </div>

            <p className="text-xs text-ink-500 dark:text-ink-400 mb-5 leading-relaxed">
              {t.pushPrimerOff}
            </p>

            <button
              type="button"
              onClick={onConfirm}
              className="w-full py-3 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 text-sm font-semibold"
            >
              {t.pushPrimerConfirm}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 mt-2 text-sm text-ink-500 dark:text-ink-400"
            >
              {t.pushPrimerLater}
            </button>

            <p className="mt-1 text-center text-xs text-ink-400 dark:text-ink-500">
              {t.pushPrimerNote}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
