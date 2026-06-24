import Link from "next/link";

// Instant loading UI for the history route. Next.js streams this immediately on
// navigation, so the menu tap feels responsive while the server fetches the
// (potentially long) scan history + signed image URLs in the background.
export default function HistoryLoading() {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-6 pb-5 safe-pt-5 flex items-center justify-between border-b border-ink-100 dark:border-ink-700">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-display tracking-tight">FitFlip</span>
          <span className="text-xs text-ink-500 dark:text-ink-400 hidden sm:inline">.app</span>
        </Link>
      </header>

      <section className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="h-9 w-40 mb-8 rounded-lg bg-ink-100 dark:bg-ink-800 animate-pulse" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-2xl border border-ink-100 dark:border-ink-700"
            >
              <div className="w-16 h-16 rounded-xl bg-ink-100 dark:bg-ink-800 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-ink-100 dark:bg-ink-800 animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-ink-100 dark:bg-ink-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
