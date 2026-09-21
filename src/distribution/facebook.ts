import type { DistributionAdapter } from "./types";

/**
 * Facebook Page feed post via the Graph API — POST /{page-id}/feed with
 * `message` + `link`. Deliberately NOT the /{page-id}/photos endpoint:
 * posting a `link` lets Facebook scrape the article's own OG tags
 * (title/description/image — already set in [locale]/[slug]/page.tsx's
 * generateMetadata) to build a real clickable link-preview card, so the
 * whole card — not just caption text — takes the reader to the site.
 *
 * Requested by Hicham 2026-09-21: every published article should reach
 * the Atlas Dépêche Facebook Page automatically. Wired into the existing
 * `distribute` worker/ADAPTERS list (src/workers/distribute.ts), same
 * idempotent social_posts pattern as X/Telegram — no separate worker.
 *
 * Needs a PAGE access token (never a user token) with `pages_manage_posts`
 * scope, from a Page Hicham administers. See [[project_rexfoot_facebook_autopublish]]
 * in memory for a real prior blocker on a different project: Meta can
 * return `(#200) ... requires pages_manage_posts` even with a correctly
 * scoped token if the owning Meta Business isn't Business-Verified — if
 * this adapter's social_posts rows show that exact error, that's the
 * cause, not a code bug.
 */

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = "https://graph.facebook.com";

export const facebookAdapter: DistributionAdapter = {
  channel: "facebook",

  isEnabled: () =>
    process.env.DISTRIBUTION_FACEBOOK_ENABLED === "true" &&
    Boolean(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),

  post: async (article, siteUrl) => {
    if (!facebookAdapter.isEnabled()) {
      return { status: "disabled" };
    }

    const pageId = process.env.FACEBOOK_PAGE_ID as string;
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN as string;
    const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${pageId}/feed`;
    const link = `${siteUrl}/${article.locale}/${article.slug}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: article.title,
          link,
          access_token: accessToken,
        }),
      });
      const body = (await res.json()) as {
        id?: string;
        error?: { message?: string; code?: number; error_subcode?: number };
      };

      if (!res.ok || body.error) {
        const err = body.error;
        return {
          status: "error",
          errorMessage: err
            ? `(#${err.code}${err.error_subcode ? `/${err.error_subcode}` : ""}) ${err.message}`
            : `${res.status} ${JSON.stringify(body)}`,
        };
      }

      // Feed post ids come back as "{page-id}_{post-id}" — the post-id half
      // is what a facebook.com/{page-id}/posts/{post-id} URL needs.
      const postId = body.id?.split("_")[1];
      return {
        status: "posted",
        externalPostId: body.id,
        externalUrl: postId ? `https://www.facebook.com/${pageId}/posts/${postId}` : undefined,
      };
    } catch (err) {
      return { status: "error", errorMessage: err instanceof Error ? err.message : String(err) };
    }
  },
};
