"use client";

import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  story: string;
  lang: "hu" | "en";
};

const DISMISS_THRESHOLD = 90;
const CLOSE_ANIM_MS = 280;

export default function StoryModal({ open, onClose, title, story, lang }: Props) {
  const [drag, setDrag] = useState(0);
  const [released, setReleased] = useState(false);
  const [closing, setClosing] = useState(false);
  const startY = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardHeightRef = useRef<number>(0);

  useEffect(() => {
    if (!open) {
      setDrag(0);
      setReleased(false);
      setClosing(false);
      startY.current = null;
      return;
    }
    // Lock background scroll while the modal is open.
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [open]);

  if (!open) return null;

  const paragraphs = story.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // Run a smooth slide-down animation, then unmount via onClose.
  const animateClose = () => {
    if (closing) return;
    haptic("tap");
    setReleased(false);
    setClosing(true);
    window.setTimeout(() => {
      onClose();
    }, CLOSE_ANIM_MS);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (closing) return;
    startY.current = e.touches[0]?.clientY ?? null;
    cardHeightRef.current = cardRef.current?.getBoundingClientRect().height ?? 0;
    setReleased(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || closing) return;
    // Only allow downward drag, and only when the card itself isn't scrolled.
    const scrollTop = cardRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) {
      startY.current = e.touches[0]?.clientY ?? null;
      return;
    }
    const delta = (e.touches[0]?.clientY ?? 0) - startY.current;
    if (delta > 0) setDrag(delta);
  };

  const onTouchEnd = () => {
    if (closing) return;
    startY.current = null;
    if (drag >= DISMISS_THRESHOLD) {
      animateClose();
    } else {
      setReleased(true);
      setDrag(0);
    }
  };

  // Translate value: while dragging follow finger; while closing, animate
  // fully off the bottom of the screen.
  const offBottom = (cardHeightRef.current || 600) + 40;
  const translateY = closing ? offBottom : drag;
  const backdropOpacity = closing
    ? 0
    : drag > 0
      ? Math.max(0.15, 1 - drag / (cardHeightRef.current || 600))
      : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={animateClose}
      onTouchMove={(e) => e.preventDefault()}
      style={{
        touchAction: "none",
        background: `rgba(0,0,0,${0.5 * backdropOpacity})`,
        transition: closing || released ? "background 0.25s ease" : "none",
      }}
    >
      <div
        ref={cardRef}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[85dvh] overflow-y-auto overscroll-contain"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: closing || released ? `transform ${CLOSE_ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)` : "none",
          touchAction: "pan-y",
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={(e) => {
          e.stopPropagation();
          onTouchMove(e);
        }}
        onTouchEnd={onTouchEnd}
      >
        <div className="sticky top-0 bg-white flex items-center justify-center pt-3 pb-1 sm:pt-4 sm:pb-2 rounded-t-3xl">
          <div className="sm:hidden w-10 h-1 rounded-full bg-ink-200" aria-hidden="true" />
          <button
            type="button"
            onClick={animateClose}
            aria-label={lang === "hu" ? "Bezárás" : "Close"}
            className="absolute right-3 top-3 w-8 h-8 rounded-full hover:bg-ink-50 text-ink-500 hover:text-ink-900 flex items-center justify-center transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-8 pt-2 sm:pt-4">
          <p className="text-[11px] uppercase tracking-wider text-ink-500 mb-1">
            {lang === "hu" ? "A darab története" : "The story"}
          </p>
          <h2 className="text-2xl font-display tracking-tight mb-4">{title}</h2>
          <div className="space-y-3 text-sm text-ink-700 leading-relaxed text-justify hyphens-auto">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p>{story}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
