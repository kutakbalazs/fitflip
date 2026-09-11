import { unsubscribeUrl } from "@/lib/marketing";

/**
 * Marketing email delivery via Resend.
 *
 * Only ever called for people who explicitly opted in — the consent check
 * lives at the call site, and nothing here will send without it.
 */

const FROM = "FitFlip <noreply@fitflip.app>";
const ENDPOINT = "https://api.resend.com/emails";

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

/**
 * Sends one message.
 *
 * Every send carries List-Unsubscribe headers alongside the in-body link.
 * That puts a native "Unsubscribe" button in Gmail and Outlook, which both
 * makes opting out easier and measurably helps deliverability: mailbox
 * providers treat a missing one-click unsubscribe as a spam signal, and
 * someone who can't find the link presses "report spam" instead.
 */
export async function sendMarketingEmail(opts: {
  to: string;
  userId: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const key = (process.env.RESEND_API_KEY ?? "").trim();
  if (!key) {
    // Not configured — say so rather than pretending it was sent.
    return { ok: false, skipped: true, error: "no_api_key" };
  }

  const unsub = unsubscribeUrl(opts.userId);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        headers: {
          "List-Unsubscribe": `<${unsub}>`,
          // Tells the provider the link can be POSTed directly, so the user
          // never leaves their inbox to unsubscribe.
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[email] send failed:", res.status, body.slice(0, 200));
      return { ok: false, error: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[email] send threw:", err);
    return { ok: false, error: "threw" };
  }
}
