"use client";

import { useState } from "react";
import { haptic } from "@/lib/haptics";

type Props = {
  open: boolean;
  onClose: () => void;
  lang: "hu" | "en";
};

export default function FeedbackModal({ open, onClose, lang }: Props) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const t =
    lang === "hu"
      ? {
          title: "Visszajelzés",
          sub: "Mi nem működött? Mi tetszik? Mit változtatnál? Bármi hasznos.",
          placeholder: "Írj, amit gondolsz…",
          send: "Küldés",
          cancel: "Mégse",
          sentTitle: "Köszönöm!",
          sentSub: "Elolvasom és válaszolok, ha kérdés van.",
          close: "Bezár",
          errShort: "Legalább pár szót írj.",
          errGeneric: "Nem sikerült elküldeni. Próbáld újra később.",
        }
      : {
          title: "Feedback",
          sub: "What broke? What do you like? What would you change? Anything helps.",
          placeholder: "Type what you think…",
          send: "Send",
          cancel: "Cancel",
          sentTitle: "Thank you!",
          sentSub: "I'll read it and reply if there's a question.",
          close: "Close",
          errShort: "Please write at least a few words.",
          errGeneric: "Couldn't send. Please try again later.",
        };

  const submit = async () => {
    if (message.trim().length < 3) {
      setError(t.errShort);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          url: typeof window !== "undefined" ? window.location.href : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          version: `v${process.env.NEXT_PUBLIC_APP_VERSION ?? ""}${
            process.env.NEXT_PUBLIC_GIT_SHA ? ` ${process.env.NEXT_PUBLIC_GIT_SHA}` : ""
          }`,
        }),
      });
      if (!res.ok) {
        setError(t.errGeneric);
        setSending(false);
        return;
      }
      haptic("success");
      setSent(true);
      setSending(false);
    } catch {
      setError(t.errGeneric);
      setSending(false);
    }
  };

  const handleClose = () => {
    setMessage("");
    setSent(false);
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium">{t.sentTitle}</h3>
            </div>
            <p className="text-sm text-ink-700 mb-5">{t.sentSub}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-full bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition"
              >
                {t.close}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-medium mb-1">{t.title}</h3>
            <p className="text-sm text-ink-500 mb-4 leading-relaxed">{t.sub}</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.placeholder}
              maxLength={5000}
              rows={5}
              disabled={sending}
              className="w-full px-3 py-2 mb-3 rounded-lg border border-ink-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10 resize-none disabled:opacity-50"
              autoFocus
            />
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={sending}
                className="px-4 py-2 rounded-full border border-ink-200 text-sm hover:bg-ink-50 transition disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={sending || message.trim().length === 0}
                className="px-4 py-2 rounded-full bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? "…" : t.send}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
