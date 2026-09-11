import { unsubscribeUrl } from "@/lib/marketing";

/**
 * Newsletter templates, HU + EN.
 *
 * House rule, and it matters more here than anywhere: the words "AI" /
 * "mesterséges intelligencia" never appear. These land in someone's inbox
 * under the FitFlip name — we sell the result (what it's worth, where to
 * sell it), not the machinery.
 *
 * Written as plain inline-styled HTML rather than a framework: email clients
 * strip <style> blocks, ignore most modern CSS, and Outlook is its own
 * planet. Boring markup survives.
 */

const SITE = "https://www.fitflip.app";

type Built = { subject: string; html: string; text: string };

function shell(opts: {
  hu: boolean;
  userId: string;
  heading: string;
  body: string[];
  ctaLabel: string;
  ctaHref: string;
}): string {
  const unsub = unsubscribeUrl(opts.userId);
  const paragraphs = opts.body
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3a3a3a;">${p}</p>`
    )
    .join("");

  return `<!doctype html>
<html lang="${opts.hu ? "hu" : "en"}">
<body style="margin:0;padding:0;background:#f5f5f5;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="background:#ffffff;border:1px solid #e8e8e8;border-radius:16px;padding:32px;">
      <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#0a0a0a;">FitFlip</p>
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#0a0a0a;font-weight:600;">${opts.heading}</h1>
      ${paragraphs}
      <a href="${opts.ctaHref}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#0a0a0a;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;">${opts.ctaLabel}</a>
    </div>
    <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#8a8a8a;text-align:center;">
      ${
        opts.hu
          ? `Ezt a levelet azért kapod, mert feliratkoztál a FitFlip hírlevelére.<br><a href="${unsub}" style="color:#8a8a8a;">Leiratkozás</a>`
          : `You're receiving this because you subscribed to the FitFlip newsletter.<br><a href="${unsub}" style="color:#8a8a8a;">Unsubscribe</a>`
      }
    </p>
  </div>
</body>
</html>`;
}

/** Sent once, after someone opts in. */
export function welcomeEmail(userId: string, hu: boolean): Built {
  if (hu) {
    return {
      subject: "Üdv a FitFlipen 👟",
      html: shell({
        hu,
        userId,
        heading: "Köszönjük, hogy feliratkoztál!",
        body: [
          "Mostantól kapsz tőlünk tippeket az eladáshoz, és szólunk, ha történik valami érdekes a hazai resell-piacon.",
          "Addig is: <strong>fotózz le egy darabot</strong>, és pillanatok alatt megtudod, mi az, mennyit ér, és hol tudod eladni. Napi 3 elemzés ingyenes.",
          "Ha bármikor meggondolnád magad, egy kattintással leiratkozhatsz — a fiókod és a scanjeid érintetlenek maradnak.",
        ],
        ctaLabel: "Irány a FitFlip",
        ctaHref: SITE,
      }),
      text: [
        "Köszönjük, hogy feliratkoztál a FitFlip hírlevelére!",
        "",
        "Mostantól kapsz tőlünk tippeket az eladáshoz, és szólunk, ha történik valami érdekes a hazai resell-piacon.",
        "",
        "Addig is: fotózz le egy darabot, és pillanatok alatt megtudod, mi az, mennyit ér, és hol tudod eladni. Napi 3 elemzés ingyenes.",
        "",
        SITE,
        "",
        `Leiratkozás: ${unsubscribeUrl(userId)}`,
      ].join("\n"),
    };
  }

  return {
    subject: "Welcome to FitFlip 👟",
    html: shell({
      hu,
      userId,
      heading: "Thanks for subscribing!",
      body: [
        "You'll get selling tips from us, and a note when something interesting happens in the resale market.",
        "In the meantime: <strong>photograph a piece</strong> and find out in seconds what it is, what it's worth, and where to sell it. Three analyses a day are free.",
        "Change your mind at any time — one click unsubscribes you, and your account and scans stay untouched.",
      ],
      ctaLabel: "Open FitFlip",
      ctaHref: SITE,
    }),
    text: [
      "Thanks for subscribing to the FitFlip newsletter!",
      "",
      "You'll get selling tips from us, and a note when something interesting happens in the resale market.",
      "",
      "In the meantime: photograph a piece and find out in seconds what it is, what it's worth, and where to sell it. Three analyses a day are free.",
      "",
      SITE,
      "",
      `Unsubscribe: ${unsubscribeUrl(userId)}`,
    ].join("\n"),
  };
}

/** Sent once to subscribers who haven't scanned in a while. */
export function reengagementEmail(userId: string, hu: boolean): Built {
  if (hu) {
    return {
      subject: "Van otthon valami, ami többet ér, mint gondolnád?",
      html: shell({
        hu,
        userId,
        heading: "Nézd meg, mi lapul a szekrényedben",
        body: [
          "A nem hordott ruháid között simán lehet olyan darab, amiért többet adnának, mint amennyire tippelnéd — csak épp nem tudod, melyik az.",
          "<strong>Fotózd le, és megmondjuk</strong>: mi az, milyen állapotú, mennyit érhet a magyar piacon, és hol tudod eladni. Ma is van 3 ingyenes elemzésed.",
        ],
        ctaLabel: "Kipróbálom",
        ctaHref: SITE,
      }),
      text: [
        "Nézd meg, mi lapul a szekrényedben",
        "",
        "A nem hordott ruháid között simán lehet olyan darab, amiért többet adnának, mint amennyire tippelnéd.",
        "",
        "Fotózd le, és megmondjuk: mi az, milyen állapotú, mennyit érhet a magyar piacon, és hol tudod eladni. Ma is van 3 ingyenes elemzésed.",
        "",
        SITE,
        "",
        `Leiratkozás: ${unsubscribeUrl(userId)}`,
      ].join("\n"),
    };
  }

  return {
    subject: "Is something in your wardrobe worth more than you think?",
    html: shell({
      hu,
      userId,
      heading: "See what's sitting in your wardrobe",
      body: [
        "Among the clothes you no longer wear, there's often a piece worth more than you'd guess — you just don't know which one.",
        "<strong>Photograph it and we'll tell you</strong>: what it is, what condition it's in, what it could fetch, and where to sell it. You have three free analyses today.",
      ],
      ctaLabel: "Try it",
      ctaHref: SITE,
    }),
    text: [
      "See what's sitting in your wardrobe",
      "",
      "Among the clothes you no longer wear, there's often a piece worth more than you'd guess.",
      "",
      "Photograph it and we'll tell you: what it is, what condition it's in, what it could fetch, and where to sell it. You have three free analyses today.",
      "",
      SITE,
      "",
      `Unsubscribe: ${unsubscribeUrl(userId)}`,
    ].join("\n"),
  };
}
