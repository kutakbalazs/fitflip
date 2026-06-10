import Anthropic from "@anthropic-ai/sdk";
import type { Listing } from "./types";

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

type OriginalImage = {
  data: string; // base64 without data: prefix
  mediaType: ImageMediaType;
};

export type VerifyHints = {
  brand?: string;
  model?: string;
  color?: string;
  /**
   * The scanned item's category (sneaker, cap, hoodie, jersey, …). Used as a
   * HARD constraint: a listing showing a different KIND of item (e.g. a cap
   * when the target is a t-shirt) is always rejected, regardless of how well
   * the brand/colour match.
   */
  itemType?: string;
};

export type VerifyOptions = {
  /**
   * Strict mode: the AI couldn't identify the brand, so we have less to go
   * on. The verifier prompt becomes much pickier, the safety-net fallback
   * is disabled (empty beats junk), and we cap the result count.
   */
  strict?: boolean;
  /**
   * Override the Anthropic model used for verification. Defaults to the
   * project-standard Sonnet model; the watcher cron passes Haiku to keep
   * the per-watcher daily cost low.
   */
  model?: string;
};

type FetchedImage = {
  data: string;
  mediaType: ImageMediaType;
};

const FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const VERIFY_PROMPT = `You are visually comparing marketplace listings to a target product image.

Image 0 is the target product the user wants to find.
The remaining images (Image 1, Image 2, …) are thumbnails from marketplace listings.

For EACH listing image, decide if it shows the SAME product as the target. Compare them VISUALLY — same brand markers, same model, same colorway pattern, same general cut (high-top vs low-top, length, fit).

Decision rules (be precise, not biased either way):
- CATEGORY GATE (check FIRST, overrides everything): the listing must show the SAME KIND of item as the target. If the target is a t-shirt, a cap / hat / shorts / bag / shoe is "same: false" — no matter how well the brand or colour matches. A jersey is not a hoodie, a cap is not a beanie, sneakers are not boots. When in doubt about the category, mark "same: false".
- "same: true" — the listing passes the category gate AND clearly shows the same model AND the same colorway pattern as the target. Different angle, lighting, background or photo quality are fine; the product itself must look like the same item.
- "same: false" — the listing shows any of: a different kind of item (see category gate), a different model number (e.g. Jordan 4 vs Jordan 1), a different cut (low-top vs high-top), a different dominant colorway (e.g. green vs brown, red vs white), or a different brand. Be willing to mark false: a wrong colorway with the right model is still wrong.
- If you genuinely cannot tell from the thumbnail (extremely blurry, key area not visible), pick whichever side you find slightly more likely — do not lean systematically either way.

Output ONLY a valid JSON object, NO markdown fences, NO other commentary:
{ "matches": [{"i": 1, "same": true|false}, {"i": 2, "same": true|false}, …] }

Include EVERY listing image (1..N) in the matches array.`;

const VERIFY_PROMPT_STRICT = `You are visually comparing marketplace listings to a target product image. The brand of the target couldn't be identified — there is no logo or label hint to fall back on, only the look of the item itself. Be EXTRA picky.

Image 0 is the target product. Images 1, 2, … are listing thumbnails.

For EACH listing, decide "same: true" ONLY if the listing visually shows what looks like THE SAME specific product as the target:
- CATEGORY GATE (check FIRST, overrides everything): the listing must show the SAME KIND of item as the target. A cap is not a t-shirt, a jersey is not a hoodie, sneakers are not boots. If the category differs, mark "same: false" no matter what else matches.
- Same general category (sneaker / shirt / jacket / pants / hoodie / dress / etc.)
- Same silhouette and cut (high-top vs low-top, hooded vs crew, slim vs loose, length, sleeve)
- Same dominant colors AND same color distribution / pattern (a black-and-white shoe is NOT the same as an all-black shoe even if both have a swoosh)
- Same material look (leather vs canvas vs knit, denim wash, suede vs smooth)
- Same distinctive design cues (stripes, panels, prints, logos placement if any)

Be HEAVILY biased toward "same: false". When in doubt, mark FALSE. It is much worse to show a wrong item to a user with no brand context than to show an empty result. Only return "same: true" when you'd confidently tell a friend "yes, that's the same thing".

Output ONLY a valid JSON object, NO markdown fences, NO commentary:
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

/**
 * kept    — listings the verifier confirmed as the same product.
 * dropped — listings it rejected (wrong colorway/model/category). Still
 *           text-relevant, so callers may present them as "similar items";
 *           they must never be mixed in with the exact matches.
 */
export type VerifyResult = { kept: Listing[]; dropped: Listing[] };

// Safety net: only when the verifier wants to drop everything (>90%) do we
// suspect over-filtering. In that case, fall back to the top half of the
// aggregator's already-scored listings — never to the full unfiltered set,
// otherwise we'd surface the bad matches we tried to filter out.
const MAX_DROP_RATIO = 0.9;

export async function verifyListingsAgainstImage(
  original: OriginalImage,
  listings: Listing[],
  hints: VerifyHints = {},
  options: VerifyOptions = {}
): Promise<VerifyResult> {
  const strict = options.strict === true;
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.FITFLIP_ANTHROPIC_KEY;
  if (!apiKey) {
    console.warn("[verify] no API key set, skipping verification");
    return { kept: listings, dropped: [] };
  }

  const candidates = listings
    .map((listing, idx) => ({ listing, idx }))
    .filter(({ listing }) => listing.imageUrl && listing.imageUrl.startsWith("http"));

  if (candidates.length === 0) return { kept: listings, dropped: [] };

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

  if (verifiable.length === 0) return { kept: listings, dropped: [] };

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

  const hintLines: string[] = [];
  if (hints.brand) hintLines.push(`- Brand: ${hints.brand}`);
  if (hints.model) hintLines.push(`- Model: ${hints.model}`);
  if (hints.color) hintLines.push(`- Colorway: ${hints.color}`);
  const hintBlock =
    hintLines.length > 0
      ? `\n\nText context for the target product (use as a tiebreaker when the photo is ambiguous):\n${hintLines.join("\n")}`
      : "";

  // Item type is a HARD constraint, not a tiebreaker — surface it separately
  // and loudly so the category gate has something explicit to anchor on.
  const typeBlock = hints.itemType
    ? `\n\nThe target item is a: ${hints.itemType}. Any listing that is NOT a ${hints.itemType} MUST be "same: false".`
    : "";

  const basePrompt = strict ? VERIFY_PROMPT_STRICT : VERIFY_PROMPT;
  content.push({ type: "text", text: basePrompt + typeBlock + hintBlock });

  let parsed: VerifyResponse | null = null;
  try {
    const response = await client.messages.create({
      model: options?.model ?? "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.warn("[verify] no text response from model");
      return { kept: listings, dropped: [] };
    }
    const cleaned = textBlock.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    parsed = JSON.parse(cleaned) as VerifyResponse;
  } catch (err) {
    console.warn("[verify] failed, returning unfiltered:", err);
    return { kept: listings, dropped: [] };
  }

  if (!parsed || !Array.isArray(parsed.matches)) return { kept: listings, dropped: [] };

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

  const dropRatio = droppedIdx.size / listings.length;
  const kept = listings.filter((_, idx) => !droppedIdx.has(idx));
  const dropped = listings.filter((_, idx) => droppedIdx.has(idx));

  // Safety net: only when essentially everything dropped — keep the top
  // few candidates from the aggregator so the panel isn't empty. We don't
  // restore everything (that would resurface the listings the AI rejected).
  // Disabled in strict mode: when we couldn't identify the brand, an empty
  // result is far better than presenting unrelated items as "best guesses".
  if (!strict && dropRatio > MAX_DROP_RATIO && kept.length === 0) {
    const topFew = listings.slice(0, Math.min(3, listings.length));
    console.warn(
      `[verify] dropped ${droppedIdx.size}/${listings.length} — over ${Math.round(MAX_DROP_RATIO * 100)}% threshold, returning top ${topFew.length} as best-guess fallback`
    );
    const topSet = new Set(topFew.map((l) => l.url));
    return { kept: topFew, dropped: listings.filter((l) => !topSet.has(l.url)) };
  }

  console.log(`[verify] kept ${kept.length}/${listings.length}${strict ? " (strict)" : ""}`);

  // Listings without imageUrl couldn't be verified → they're not in droppedIdx,
  // so they survive the filter as a conservative default. In strict mode we
  // drop them too: with no brand to anchor on, an unverifiable listing is
  // more likely to be noise.
  if (strict) {
    const strictKept = kept.filter((l) => l.imageUrl);
    const strictKeptSet = new Set(strictKept.map((l) => l.url));
    return {
      kept: strictKept,
      dropped: listings.filter((l) => !strictKeptSet.has(l.url)),
    };
  }
  return { kept, dropped };
}
