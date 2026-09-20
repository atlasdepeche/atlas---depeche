/**
 * "Important news" email alert — requested directly: a notification when
 * something from an official/institutional source lands, since those are
 * exactly the sources that report before the newspapers do (see
 * seed-sources.ts's "official Moroccan institutions" block). Scoped to
 * category "institutional" specifically, not every new item — with 25+
 * general news sources feeding the radar every 30 min, alerting on all of
 * them would be exactly the "molestar con tantos mensajes" the user
 * explicitly said he wants to avoid.
 *
 * Uses Resend (resend.com) — a separate account/API key for this project,
 * not reused from any other project. Free tier, no card required. Sends
 * from the sandbox address (onboarding@resend.dev) straight to the
 * user's own inbox — no custom domain verification needed for a
 * single-recipient alert like this.
 */
const ALERT_TO = "atlasdepeche@gmail.com";
const ALERT_FROM = "Atlas Dépêche <onboarding@resend.dev>";

export async function sendAlertEmail(item: {
  title: string;
  url: string;
  sourceName: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[alert-email] RESEND_API_KEY not set — skipping alert.");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ALERT_FROM,
      to: ALERT_TO,
      subject: `🔔 ${item.sourceName} : ${item.title.slice(0, 80)}`,
      html: `<p><strong>${item.sourceName}</strong> vient de publier :</p><p>${item.title}</p><p><a href="${item.url}">${item.url}</a></p>`,
    }),
  });

  if (!res.ok) {
    console.log(`[alert-email] Resend API ${res.status}: ${await res.text()}`);
  }
}
