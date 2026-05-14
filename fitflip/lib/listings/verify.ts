import Anthropic from "@anthropic-ai/sdk";
import type { Listing } from "./types";

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

type OriginalImage = {
  data: string; // base64 without data: prefix
  mediaType: ImageMediaType;
};

type FetchedImage = {
  data: string;
  mediaType: ImageMediaType;
};

const FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const VERIFY_PROMPT = `You are verifying marketplace listings against a target product image.

The first image (Image 0) is the target product the user wants to find.
The remaining images (Image 1, Image 2, …) are thumbnails from marketplace listings.

For EACH listing image, decide whether it shows the EXACT SAME product as the target:
- Same BRAND
- Same MODEL (e.g. "Air Jordan 1" is NOT the same as "Air Jordan 4")
- Same COLORWAY (e.g. "Dark Mocha" is NOT the same as "Travis Scott", "Lucky Green", "Light Fusion Red", etc.)
- Same CUT / silhouette (high-top vs low-top vs mid)

Be STRICT. If you cannot tell from the thumbnail (blurry, angle hides key features), default to "same: false" — it is better to drop a maybe-match than to mislead the user.

Output ONLY a valid JSON object, NO markdown fences, NO other commentary:
{ "matches": [{"i": 1, "same": true|false}, {"i": 2, "same": true|false}, …] }

Include EVERY listing image (1..N) in the matches array.`;

function normalizeMediaType(raw: string | null): ImageMediaType {
  const t = (raw ?? "image/jpeg").split(";")[0].trim().toLowerCase();
  if (t === "image/png" || t === "image/webp" || t === "image/gif" || t === "image/jpeg") {
    return t;
  }
  return "image/jpeg";
}

async function fetchAsBase64(url: string): Promise<FetchedImage | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": FETCH_UA,
        Accept: "image/avif,image/webp,image/png,image/*;q=0.8,*/*;q=0.5",
      },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 4 * 1024 * 1024) return null;
    const mediaType = normalizeMediaType(res.headers.get("content-type"));
    return { data: buf.toString("base64"), mediaType };
  } catch {
    return null;
  }
}

type VerifyMatch = { i: number; same: boolean };
type VerifyResponse = { matches: VerifyMatch[] };

export async function verifyListingsAgainstImage(
  original: OriginalImage,
  listings: Listing[]
): Promise<Listing[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.FITFLIP_ANTHROPIC_KEY;
  if (!apiKey) {
    console.warn("[verify] no API key set, skipping verification");
    return listings;
  }

  const candidates = listings
    .map((listing, idx) => ({ listing, idx }))
    .filter(({ listing }) => listing.imageUrl && listing.imageUrl.startsWith("http"));

  if (candidates.length === 0) return listings;

  // Parallel-fetch each listing's thumbnail. Anything that fails to load is
  // skipped from the AI prompt — we can't visually check those, so we'll
  // keep them in the result without verification (conservative default).
  const fetched = await Promise.all(
    candidates.map(async (entry) => ({
      entry,
      image: await fetchAsBase64(entry.listing.imageUrl as string),
    }))
  );
  const verifiable = fetched.filter(
    (f): f is { entry: { listing: Listing; idx: number }; image: FetchedImage } =>
      f.image !== null
  );

  if (verifiable.length === 0) return listings;

  const client = new Anthropic({ apiKey });

  type Block =
    | { type: "text"; text: string }
    | {
        type: "image";
        source: { type: "base64"; media_type: ImageMediaType; data: string };
      };
  const content: Block[] = [
    { type: "text", text: "Image 0 (target product the user wants to find):" },
    {
      type: "image",
      source: { type: "base64", media_type: original.mediaType, data: original.data },
    },
  ];

  verifiable.forEach(({ image }, position) => {
    content.push({ type: "text", text: `Image ${position + 1}:` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.data },
    });
  });

  content.push({ type: "text", text: VERIFY_PROMPT });

  let parsed: VerifyResponse | null = null;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.warn("[verify] no text response from model");
      return listings;
    }
    const cleaned = textBlock.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    parsed = JSON.parse(cleaned) as VerifyResponse;
  } catch (err) {
    console.warn("[verify] failed, returning unfiltered:", err);
    return listings;
  }

  if (!parsed || !Array.isArray(parsed.matches)) return listings;

  // 1-based position (the model's `i`) → original listings index
  const positionToOriginalIdx = new Map<number, number>();
  verifiable.forEach(({ entry }, position) => {
    positionToOriginalIdx.set(position + 1, entry.idx);
  });

  const droppedIdx = new Set<number>();
  for (const m of parsed.matches) {
    if (m.same === false) {
      const origIdx = positionToOriginalIdx.get(m.i);
      if (typeof origIdx === "number") droppedIdx.add(origIdx);
    }
  }

  // Keep listings we couldn't verify (no image / fetch failed) as conservative
  // fallback — only explicitly-rejected ones get dropped.
  return listings.filter((_, idx) => !droppedIdx.has(idx));
}
