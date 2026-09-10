"use client";

import { useState } from "react";
import { translations } from "@/lib/translations";
import { track } from "@/lib/analytics";

type Draft = {
  title: string;
  description: string;
  priceLabel: string | null;
  rangeLabel: string | null;
};

/** Copy-to-clipboard with a short "copied" confirmation. */
function CopyButton({ text, label, copied }: { text: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked — the text is on screen to copy by hand */
        }
      }}
      className="shrink-0 rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1 text-xs font-medium hover:border-ink-400 transition"
    >
      {done ? copied : label}
    </button>
  );
}

/**
 * "Write the listing" — turns a scan result into a ready-to-post ad.
 *
 * The app already says what a piece is and what it's worth; this closes the
 * loop on "Sell." by writing the ad too, so the user isn't left staring at a
 * blank Vinted form.
 *
 * The price shown is the one the app already estimated (computed server-side,
 * not written by the model), so the ad can never quote a figure that
 * contradicts the result above it.
 */
export default function ListingDraft({
  scanId,
  hu,
  size,
}: {
  scanId: string;
  hu: boolean;
  size?: string | null;
}) {
  const t = hu ? translations.hu : translations.en;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(false);
    track("listing_draft_created", { regenerate: draft !== null });
    try {
      const res = await fetch("/api/listing-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_id: scanId, lang: hu ? "hu" : "en", size: size ?? "" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(true);
      } else {
        setDraft(data as Draft);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!draft) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="w-full rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950 px-4 py-3 text-left transition hover:border-ink-400 disabled:opacity-60"
        >
          <span className="block text-sm font-semibold">
            {loading ? t.draftLoading : t.draftCta}
          </span>
          <span className="block text-xs text-ink-500 dark:text-ink-400">{t.draftSub}</span>
        </button>
        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{t.draftError}</p>
        )}
      </div>
    );
  }

  const full = [draft.title, "", draft.description, "", draft.priceLabel ?? ""]
    .join("\n")
    .trim();

  return (
    <div className="mt-4 rounded-2xl border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-900 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold">{t.draftCta}</h3>
        <CopyButton text={full} label={t.draftCopy} copied={t.draftCopied} />
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-ink-500 dark:text-ink-400">
              {t.draftTitleLabel}
            </span>
            <CopyButton text={draft.title} label={t.draftCopy} copied={t.draftCopied} />
          </div>
          <p className="text-sm">{draft.title}</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-ink-500 dark:text-ink-400">
              {t.draftDescLabel}
            </span>
            <CopyButton text={draft.description} label={t.draftCopy} copied={t.draftCopied} />
          </div>
          <p className="text-sm whitespace-pre-line leading-relaxed">{draft.description}</p>
        </div>

        {draft.priceLabel && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-ink-500 dark:text-ink-400">
                {t.draftPriceLabel}
              </span>
              <CopyButton text={draft.priceLabel} label={t.draftCopy} copied={t.draftCopied} />
            </div>
            <p className="text-sm font-semibold">{draft.priceLabel}</p>
            {draft.rangeLabel && (
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                {t.draftPriceNote.replace("{range}", draft.rangeLabel)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-500 dark:text-ink-400">{t.draftDisclaimer}</p>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="shrink-0 text-xs underline underline-offset-2 text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white disabled:opacity-60"
        >
          {loading ? t.draftLoading : t.draftRegenerate}
        </button>
      </div>
    </div>
  );
}
