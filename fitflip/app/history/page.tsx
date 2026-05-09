import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Scan = {
  id: string;
  created_at: string;
  recognized: boolean;
  brand: string | null;
  model: string | null;
  era: string | null;
  condition: string | null;
  estimated_value_min_huf: number | null;
  estimated_value_max_huf: number | null;
  description: string | null;
  confidence: string | null;
};

function formatHuf(n: number | null): string {
  if (n === null) return "—";
  return new Intl.NumberFormat("hu-HU").format(n) + " Ft";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HistoryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: scans } = await supabase
    .from("scans")
    .select("id, created_at, recognized, brand, model, era, condition, estimated_value_min_huf, estimated_value_max_huf, description, confidence")
    .order("created_at", { ascending: false })
    .limit(100);

  const items = (scans ?? []) as Scan[];

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-ink-100">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-medium tracking-tight">FitFlip</span>
          <span className="text-xs text-ink-500 hidden sm:inline">.app</span>
        </Link>
        <Link href="/" className="text-sm text-ink-500 hover:text-ink-900 transition">
          ← Vissza
        </Link>
      </header>

      <section className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-display tracking-tight mb-8">Scan előzmények</h1>

        {items.length === 0 ? (
          <div className="border border-ink-100 rounded-2xl p-8 bg-ink-50 text-center">
            <p className="text-ink-500">Még nincs scan-ed. Töltsd fel az elsőt!</p>
            <Link
              href="/"
              className="mt-4 inline-block px-6 py-2 rounded-full bg-ink-900 text-white text-sm hover:bg-ink-700 transition"
            >
              Új scan
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((scan) => (
              <li
                key={scan.id}
                className="border border-ink-100 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h2 className="font-medium">
                      {scan.recognized
                        ? <>{scan.brand ?? "—"}{scan.model ? <span className="text-ink-500"> — {scan.model}</span> : null}</>
                        : <span className="text-ink-500">Nem azonosított</span>
                      }
                    </h2>
                    {scan.era && (
                      <p className="text-xs text-ink-500 mt-0.5">{scan.era}</p>
                    )}
                  </div>
                  <time className="text-xs text-ink-500 shrink-0">
                    {formatDate(scan.created_at)}
                  </time>
                </div>
                {scan.recognized && (
                  <div className="text-sm text-ink-700 space-y-1 mt-3">
                    {scan.condition && (
                      <p>
                        <span className="text-ink-500">Állapot: </span>
                        {scan.condition}
                      </p>
                    )}
                    {(scan.estimated_value_min_huf !== null || scan.estimated_value_max_huf !== null) && (
                      <p>
                        <span className="text-ink-500">Becsült érték: </span>
                        {formatHuf(scan.estimated_value_min_huf)} – {formatHuf(scan.estimated_value_max_huf)}
                      </p>
                    )}
                  </div>
                )}
                {scan.description && (
                  <p className="text-xs text-ink-500 mt-3 leading-relaxed">
                    {scan.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
