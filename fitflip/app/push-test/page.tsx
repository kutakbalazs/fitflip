"use client";

import { useState } from "react";

/**
 * TEMPORARY — delete once push is confirmed working on a device.
 *
 * It exists because every other way to fire a test notification needs
 * something the phone doesn't have: a desktop browser signed into the right
 * account, or a JS console, or the CRON_SECRET that only Vercel holds. This
 * needs a phone, a session, and one tap.
 *
 * It sends nothing by itself. The POST it calls takes no user id, so it can
 * only ever reach the devices of whoever is signed in here.
 */
export default function PushTestPage() {
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (method: "GET" | "POST") => {
    setBusy(true);
    setOut(null);
    try {
      const res = await fetch("/api/push/test", { method });
      const json = await res.json();
      setOut(`${res.status}\n\n${JSON.stringify(json, null, 2)}`);
    } catch (e) {
      setOut(`hiba: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-ink-900 text-ink-900 dark:text-white p-6">
      <h1 className="text-xl font-semibold mb-1">Push teszt</h1>
      <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">
        Ideiglenes oldal. Csak a most bejelentkezett fiók eszközeire küld.
      </p>

      <div className="flex flex-col gap-3 max-w-sm">
        <button
          type="button"
          onClick={() => run("GET")}
          disabled={busy}
          className="py-3 rounded-full border border-ink-200 dark:border-ink-700 text-sm font-medium disabled:opacity-50"
        >
          Állapot lekérdezése
        </button>
        <button
          type="button"
          onClick={() => run("POST")}
          disabled={busy}
          className="py-3 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 text-sm font-medium disabled:opacity-50"
        >
          Teszt értesítés küldése
        </button>
      </div>

      {busy && <p className="mt-6 text-sm text-ink-500">Fut…</p>}
      {out && (
        <pre className="mt-6 p-4 rounded-xl bg-ink-50 dark:bg-ink-800 text-xs overflow-x-auto whitespace-pre-wrap break-all">
          {out}
        </pre>
      )}
    </main>
  );
}
