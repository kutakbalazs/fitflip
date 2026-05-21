"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";

const PULL_THRESHOLD = 70;
const MAX_DRAG = 110;

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0]?.clientY ?? null;
      triggered.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing) return;
      const delta = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      // Resistance curve so the pull feels natural.
      const eased = Math.min(MAX_DRAG, delta * 0.5);
      setPull(eased);
      if (!triggered.current && eased >= PULL_THRESHOLD) {
        triggered.current = true;
        haptic("tap");
      }
    };

    const onTouchEnd = async () => {
      if (startY.current === null) return;
      const wasTriggered = triggered.current;
      startY.current = null;
      triggered.current = false;
      if (wasTriggered) {
        haptic("success");
        setRefreshing(true);
        setPull(40);
        try {
          router.refresh();
          // Give the refresh some visible time so the user sees feedback.
          await new Promise((r) => setTimeout(r, 600));
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [router, refreshing]);

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-30 flex justify-center pointer-events-none"
        style={{
          transform: `translateY(${Math.max(0, pull - 28)}px)`,
          opacity: pull > 5 ? Math.min(1, pull / PULL_THRESHOLD) : 0,
          transition: refreshing || pull === 0 ? "transform 0.25s ease, opacity 0.25s ease" : "none",
        }}
      >
        <div className="mt-2 w-9 h-9 rounded-full bg-white border border-ink-100 shadow-sm flex items-center justify-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-ink-700 ${refreshing ? "animate-spin" : ""}`}
            style={{
              transform: refreshing
                ? "none"
                : `rotate(${Math.min(180, (pull / PULL_THRESHOLD) * 180)}deg)`,
              transition: refreshing ? "none" : "transform 0.05s linear",
            }}
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <polyline points="3 4 3 10 9 10" />
          </svg>
        </div>
      </div>
      {children}
    </>
  );
}
