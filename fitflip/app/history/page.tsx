import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LegalFooter from "@/components/LegalFooter";

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
  image_path: string | null;
  defects: string[] | null;
  condition_discount_pct: number | null;
};

type ScanWithUrl = Scan & { imageUrl: string | null };

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

  const fullCols = "id, created_at, recognized, brand, model, era, condition, estimated_value_min_huf, estimated_value_max_huf, description, confidence, image_path, defects, condition_discount_pct";
  const legacyCols = "id, created_at, recognized, brand, model, era, condition, estimated_value_min_huf, estimated_value_max_huf, description, confidence, image_path";

  let scans: unknown[] | null = null;
  const primary = await supabase
    .from("scans")
    .select(fullCols)
    .order("created_at", { ascending: false })
    .limit(100);
  if (primary.data) {
    scans = primary.data;
  } else {
    const legacy = await supabase
      .from("scans")
      .select(legacyCols)
      .order("created_at", { ascending: false })
      .limit(100);
    scans = legacy.data;
  }

  const items = (scans ?? []) as Scan[];

  const admin = createAdminClient();
  const itemsWithUrls: ScanWithUrl[] = await Promise.all(
    items.map(async (scan) => {
      if (!scan.image_path) return { ...scan, imageUrl: null };
      const { data, error } = await admin.storage
        .from("scan-images")
        .createSignedUrl(scan.image_path, 3600);
      if (error || !data?.signedUrl) return { ...scan, imageUrl: null };
      return { ...scan, imageUrl: data.signedUrl };
    })
  );

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

        {itemsWithUrls.length === 0 ? (
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
            {itemsWithUrls.map((scan) => (
              <li
                key={scan.id}
                className="border border-ink-100 rounded-2xl p-5"
              >
                <div className="flex gap-4">
                  {scan.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={scan.imageUrl}
                      alt={scan.brand ?? "scan"}
                      loading="lazy"
                      className="w-20 h-20 rounded-lg object-cover bg-ink-50 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-ink-50 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h2 className="font-medium truncate">
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
                      <div className="text-sm text-ink-700 space-y-1 mt-1">
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
                            {scan.condition_discount_pct && scan.condition_discount_pct > 0 ? (
                              <span className="text-ink-500"> ({scan.condition_discount_pct}% levonva sérülés miatt)</span>
                            ) : null}
                          </p>
                        )}
                      </div>
                    )}
                    {scan.defects && scan.defects.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-[11px] uppercase tracking-wider text-amber-800 mb-1">
                          Látható hibák
                        </p>
                        <ul className="text-xs text-amber-900 space-y-0.5">
                          {scan.defects.map((d, i) => (
                            <li key={i}>• {d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {scan.description && (
                      <p className="text-xs text-ink-500 mt-3 leading-relaxed">
                        {scan.description}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="px-6 py-6 border-t border-ink-100">
        <LegalFooter />
      </footer>
    </main>
  );
}
