"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readLang } from "@/lib/lang";
import { isNativePlatform } from "@/lib/native";
import { captureViaNativeCamera } from "@/lib/quickScan";
import { setPendingScanFile } from "@/lib/pendingScan";

/**
 * The home-screen widget's destination: open the camera, then get out of the
 * way.
 *
 * The whole point of the widget is skipping steps, so this screen is not
 * meant to be looked at. On the native app it fires the camera on mount and
 * hands the photo to the home page, which runs the same analysis as every
 * other scan. On the web — where a programmatic camera-open is blocked
 * without a user gesture — it falls back to one large button.
 */
export default function QuickScanPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [lang, setLang] = useState<"hu" | "en">("hu");
  const [needsTap, setNeedsTap] = useState(false);
  // Strict Mode mounts effects twice in development; opening the camera twice
  // would leave a second picker behind the first.
  const started = useRef(false);

  const handoff = useCallback(
    (file: File | null) => {
      if (file) setPendingScanFile(file);
      // replace, not push: the back gesture should leave the app the way the
      // widget found it, not return to a camera that already fired.
      router.replace("/");
    },
    [router]
  );

  useEffect(() => {
    setLang(readLang());
    if (started.current) return;
    started.current = true;

    if (!isNativePlatform()) {
      setNeedsTap(true);
      return;
    }
    void captureViaNativeCamera().then(handoff);
  }, [handoff]);

  const t =
    lang === "hu"
      ? { title: "Fotózz le egy darabot", cta: "Kamera megnyitása", opening: "Kamera indul…" }
      : { title: "Photograph a piece", cta: "Open camera", opening: "Opening camera…" };

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 px-8 bg-white dark:bg-ink-950 text-center">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          handoff(file);
        }}
      />

      {needsTap ? (
        <>
          <h1 className="text-xl font-display tracking-tight">{t.title}</h1>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-8 py-4 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-medium text-sm active:scale-95 transition"
          >
            {t.cta}
          </button>
        </>
      ) : (
        <p className="text-sm text-ink-500 dark:text-ink-400">{t.opening}</p>
      )}
    </main>
  );
}
