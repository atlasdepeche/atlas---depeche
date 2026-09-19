import type { ImageDistributionAdapter } from "./types";

/**
 * Instagram Graph API content publishing — a real (image required) post to
 * @atlasdepeche, requested explicitly to auto-post every new radar item.
 *
 * Hard platform limitation, not something this code can work around:
 * Instagram captions render a URL as plain, non-clickable text — there is
 * no "share this link" post type like X/Telegram/Facebook have. The only
 * way a reader gets from an Instagram post to the actual article is the
 * single link in the profile bio (kept pointed at siteUrl), which the
 * caption below tells them to use. A Stories "link sticker" IS clickable,
 * but is a different content type/API path and expires in 24h — not what
 * was asked for here.
 *
 * Two-step Content Publishing flow (Meta's own required shape — this
 * isn't a design choice made here): create a media container with the
 * image + caption, then publish that container.
 * https://developers.facebook.com/docs/instagram-platform/content-publishing
 *
 * Real setup the user completed outside this code (none of it is
 * something an API call from here can provision): converted @atlasdepeche
 * to a Professional account and generated a long-lived access token via
 * "Instagram API with Instagram Login" (developers.facebook.com's newer,
 * simpler onboarding path — no linked Facebook Page required, unlike the
 * older Facebook-Login-based flow this was originally written against).
 *
 * That flow's tokens are prefixed "IGAA..." (not "EAA..." like Facebook-
 * Login tokens) and MUST be used against graph.instagram.com, never
 * graph.facebook.com — sending an IGAA token to graph.facebook.com fails
 * with a confusing, non-obvious error (confirmed live 2026-09-19:
 * "Expected 1 '.' in the input between the postcard and the payload" —
 * graph.facebook.com misparsing a token shape it doesn't recognize, not a
 * malformed request on our side). This was originally built against
 * graph.facebook.com per Meta's general Content Publishing docs before
 * this distinction was confirmed against the real account.
 *
 * Worth knowing before relying on this at scale: Instagram Feed posts
 * require roughly a 4:5–1.91:1 aspect ratio AND (per the user's own
 * account setup notes) may require the image to be a public JPG URL —
 * a source's photo outside those constraints makes Meta reject the
 * container, which this adapter surfaces as a normal status="error" row
 * (see src/workers/instagram-publish.ts), not a silent failure — no
 * cropping/reprocessing is done here.
 */

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = "https://graph.instagram.com";

function buildCaption(item: {
  title: string;
  sourceName: string;
  locale: "ar" | "fr";
}, siteUrl: string): string {
  return item.locale === "ar"
    ? `${item.title}\n\n📰 المصدر: ${item.sourceName}\n🔗 الرابط الكامل في السيرة الذاتية (bio) — ${siteUrl}`
    : `${item.title}\n\n📰 Source : ${item.sourceName}\n🔗 Lien complet dans la bio — ${siteUrl}`;
}

export const instagramAdapter: ImageDistributionAdapter = {
  channel: "instagram",

  isEnabled: () =>
    process.env.DISTRIBUTION_INSTAGRAM_ENABLED === "true" &&
    Boolean(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID && process.env.INSTAGRAM_ACCESS_TOKEN),

  postImage: async (item, siteUrl) => {
    if (!instagramAdapter.isEnabled()) {
      return { status: "disabled" };
    }

    const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID as string;
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN as string;
    const base = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${igUserId}`;
    const caption = buildCaption(item, siteUrl);

    try {
      const containerRes = await fetch(`${base}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: item.imageUrl,
          caption,
          access_token: accessToken,
        }),
      });
      const containerBody = (await containerRes.json()) as {
        id?: string;
        error?: { message?: string };
      };

      if (!containerRes.ok || !containerBody.id) {
        return {
          status: "error",
          errorMessage: `create container: ${containerRes.status} ${containerBody.error?.message ?? JSON.stringify(containerBody)}`,
        };
      }

      const publishRes = await fetch(`${base}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerBody.id,
          access_token: accessToken,
        }),
      });
      const publishBody = (await publishRes.json()) as {
        id?: string;
        error?: { message?: string };
      };

      if (!publishRes.ok || !publishBody.id) {
        return {
          status: "error",
          errorMessage: `publish: ${publishRes.status} ${publishBody.error?.message ?? JSON.stringify(publishBody)}`,
        };
      }

      // The publish response's `id` is the numeric media ID, NOT the
      // shortcode an actual instagram.com/p/<shortcode>/ URL uses — that
      // has to be read back separately via the `permalink` field. Posting
      // itself already succeeded at this point either way, so a failure
      // here degrades to "posted, but no link on record" rather than being
      // reported as an error.
      let externalUrl: string | undefined;
      try {
        const permalinkRes = await fetch(
          `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${publishBody.id}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`,
        );
        const permalinkBody = (await permalinkRes.json()) as { permalink?: string };
        externalUrl = permalinkBody.permalink;
      } catch {
        // Non-fatal — see comment above.
      }

      return {
        status: "posted",
        externalPostId: publishBody.id,
        externalUrl,
      };
    } catch (err) {
      return { status: "error", errorMessage: err instanceof Error ? err.message : String(err) };
    }
  },
};
