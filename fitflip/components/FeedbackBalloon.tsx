"use client";

import { useEffect, useRef, useState } from "react";
import FeedbackModal from "./FeedbackModal";
import { haptic } from "@/lib/haptics";

const STORAGE_KEY = "ff-feedback-balloon-pos";
const LONG_PRESS_MS = 450;
const DRAG_CANCEL_PX = 6;

type Pos = { x: number; y: number };

export default function FeedbackBalloon() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<"hu" | "en">("hu");
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const downPoint = useRef<{ x: number; y: number; t: number } | null>(null);
  const justDragged = useRef(false);

  useEffect(() => {
    setMounted(true);
    // Determine viewport-relative starting position (top-right by default).
    let initial: Pos = { x: window.innerWidth - 60, y: 76 };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Pos;
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          initial = clampToViewport(parsed);
        }
      }
      const savedLang = localStorage.getItem("ff_lang") ?? localStorage.getItem("ff-lang");
      if (savedLang === "en") setLang("en");
    } catch {
      /* ignore */
    }
    setPos(initial);

    const onResize = () => setPos((p) => clampToViewport(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Hide while the feedback modal itself is open (would float on top of it).
  if (!mounted || open) {
    return (
      <FeedbackModal
        open={open}
        onClose={() => setOpen(false)}
        lang={lang}
      />
    );
  }

  const startLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
    }
    longPressTimer.current = window.setTimeout(() => {
      setDragging(true);
      haptic("tap");
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    downPoint.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    justDragged.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    startLongPress();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!downPoint.current) return;
    const dx = e.clientX - downPoint.current.x;
    const dy = e.clientY - downPoint.current.y;
    const moved = Math.hypot(dx, dy);

    if (!dragging) {
      // Cancel long-press if the user starts moving before the threshold.
      if (moved > DRAG_CANCEL_PX) {
        cancelLongPress();
      }
      return;
    }

    // In drag mode: follow the finger/cursor.
    justDragged.current = true;
    setPos(clampToViewport({ x: e.clientX - 22, y: e.clientY - 22 }));
  };

  const onPointerUp = () => {
    cancelLongPress();
    if (dragging) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
      } catch {
        /* ignore */
      }
      setDragging(false);
      return;
    }
    // Short tap (no drag, no long press): open the modal.
    if (downPoint.current && Date.now() - downPoint.current.t < LONG_PRESS_MS) {
      haptic("tap");
      setOpen(true);
    }
    downPoint.current = null;
  };

  const label = lang === "hu" ? "Visszajelzés" : "Feedback";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "fixed",
          top: `${pos.y}px`,
          left: `${pos.x}px`,
          touchAction: "none",
          transition: dragging ? "none" : "transform 0.15s ease",
          transform: dragging ? "scale(1.15)" : "scale(1)",
          zIndex: 40,
          fontSize: "28px",
          lineHeight: 1,
          userSelect: "none",
          background: "transparent",
          border: 0,
          padding: 6,
          cursor: dragging ? "grabbing" : "pointer",
          filter: dragging ? "drop-shadow(0 4px 10px rgba(0,0,0,0.25))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
        }}
      >
        <span role="img" aria-hidden="true">🎈</span>
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} lang={lang} />
    </>
  );
}

function clampToViewport(p: Pos): Pos {
  if (typeof window === "undefined") return p;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const SIZE = 44;
  return {
    x: Math.max(8, Math.min(w - SIZE - 8, p.x)),
    y: Math.max(8, Math.min(h - SIZE - 8, p.y)),
  };
}
