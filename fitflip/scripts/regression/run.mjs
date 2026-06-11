// FitFlip scan-pipeline regression suite.
//
// Runs every case in cases.json through the REAL scan + listings flow on a
// locally running dev server, asserts the expectations, then cleans up the
// disposable test user it created. Usage: see README.md in this directory.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, "..", "..");
const BASE = process.env.FF_BASE_URL || "http://localhost:3000";

const envFile = readFileSync(join(ROOT, ".env.local"), "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const REF = new URL(SUPA).hostname.split(".")[0];

const admin = (p, o = {}) =>
  fetch(`${SUPA}${p}`, {
    ...o,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      ...(o.headers || {}),
    },
  });
const b64url = (s) =>
  Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function setup() {
  const email = `regression-${Date.now()}@fitflip-test.local`;
  const pass = "Rg-" + Math.random().toString(36).slice(2, 12);
  const cu = await (
    await admin("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, password: pass, email_confirm: true }),
    })
  ).json();
  if (!cu.id) throw new Error("user create failed: " + JSON.stringify(cu));
  await admin(`/rest/v1/profiles?id=eq.${cu.id}`, {
    method: "PATCH",
    body: JSON.stringify({ is_premium: true }),
  });
  const session = await (
    await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    })
  ).json();
  const val = "base64-" + b64url(JSON.stringify(session));
  const name = `sb-${REF}-auth-token`;
  const MAX = 3180;
  const cookie =
    val.length <= MAX
      ? `${name}=${val}`
      : val.match(new RegExp(`.{1,${MAX}}`, "g")).map((c, i) => `${name}.${i}=${c}`).join("; ");
  return { userId: cu.id, cookie };
}

async function cleanup(userId) {
  const rows = await (await admin(`/rest/v1/scans?user_id=eq.${userId}&select=image_path`)).json();
  const paths = (Array.isArray(rows) ? rows : []).map((r) => r.image_path).filter(Boolean);
  if (paths.length) {
    await admin(`/storage/v1/object/scan-images`, {
      method: "DELETE",
      body: JSON.stringify({ prefixes: paths }),
    });
  }
  await admin(`/rest/v1/scans?user_id=eq.${userId}`, { method: "DELETE" });
  await admin(`/rest/v1/profiles?id=eq.${userId}`, { method: "DELETE" });
  await admin(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
}

function buildQueries(scan) {
  const brand = scan.brand ?? "";
  const model = scan.model ?? "";
  const color = scan.color ?? "";
  const bT = brand.split(/\s+/).filter(Boolean);
  const mT = model.split(/\s+/).filter(Boolean);
  const cT = Array.from(
    new Set([
      ...color.split(/\s+/).filter(Boolean),
      ...(Array.isArray(scan.base_colors) ? scan.base_colors.filter(Boolean) : []),
    ])
  );
  const lastBrand = bT[bT.length - 1] ?? "";
  const firstModel = mT[0] ?? "";
  const firstColor = cT[0] ?? "";
  const lastColor = cT[cT.length - 1] ?? "";
  const queries = [];
  const push = (q) => {
    const t = q.trim();
    if (t && !queries.includes(t)) queries.push(t);
  };
  push(`${brand} ${model}`);
  if (scan.search_query) push(scan.search_query);
  if (lastBrand && firstModel) push(`${lastBrand} ${firstModel}`);
  if (lastBrand && firstModel && firstColor) push(`${lastBrand} ${firstModel} ${firstColor}`);
  if (lastBrand && lastColor) push(`${lastBrand} ${lastColor}`);
  return { queries, bT, mT, cT, brand, model, color };
}

const cases = JSON.parse(readFileSync(join(DIR, "cases.json"), "utf8"));
let failures = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    failures++;
  }
};

console.log(`FitFlip regression — ${cases.length} eset, cél: ${BASE}\n`);
const { userId, cookie } = await setup();
try {
  for (const c of cases) {
    console.log(`▶ ${c.name}`);
    const img = readFileSync(join(DIR, "images", c.image)).toString("base64");
    const t0 = Date.now();
    const scanRes = await fetch(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ images: [{ data: img, mediaType: "image/jpeg" }], lang: "hu" }),
    });
    const scan = await scanRes.json();
    const scanSecs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `  scan ${scanSecs}s → brand=${scan.brand} model=${scan.model} color=${scan.color} type=${scan.item_type}`
    );

    const e = c.expect;
    if (e.recognized !== undefined) check("recognized", scan.recognized === e.recognized);
    if (e.brandPattern)
      check("brand", new RegExp(e.brandPattern, "i").test(scan.brand ?? ""), `kapott: "${scan.brand}"`);
    if (e.modelPattern)
      check("model", new RegExp(e.modelPattern, "i").test(scan.model ?? ""), `kapott: "${scan.model}"`);
    if (e.itemType) check("item_type", scan.item_type === e.itemType, `kapott: "${scan.item_type}"`);

    if (e.minExactListings !== undefined || e.minTotalListings !== undefined) {
      const { queries, bT, mT, cT, brand, model, color } = buildQueries(scan);
      const t1 = Date.now();
      const lr = await fetch(`${BASE}/api/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          queries,
          brandTokens: bT,
          modelTokens: mT,
          colorTokens: cT,
          brand,
          model,
          color,
          itemType: scan.item_type ?? "",
          ...(scan.scan_id ? { scanId: scan.scan_id } : {}),
        }),
      });
      const lj = await lr.json();
      const exact = lj.listings?.length ?? 0;
      const sim = lj.similar?.length ?? 0;
      console.log(
        `  listings ${((Date.now() - t1) / 1000).toFixed(1)}s → exact=${exact} similar=${sim} (verified=${lj.visuallyVerified})`
      );
      if (e.minExactListings !== undefined)
        check(`exact >= ${e.minExactListings}`, exact >= e.minExactListings, `kapott: ${exact}`);
      if (e.minTotalListings !== undefined)
        check(`total >= ${e.minTotalListings}`, exact + sim >= e.minTotalListings, `kapott: ${exact + sim}`);
    }
    console.log("");
  }
} finally {
  await cleanup(userId);
  console.log("(teszt-felhasználó és adatai törölve)");
}

if (failures > 0) {
  console.log(`\n❌ ${failures} elvárás bukott.`);
  process.exit(1);
}
console.log("\n✅ Minden eset átment.");
