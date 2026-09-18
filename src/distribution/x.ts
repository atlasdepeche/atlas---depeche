import { createHmac, randomBytes } from "node:crypto";
import type { DistributionAdapter } from "./types";

/**
 * X (Twitter) v2 tweet creation, OAuth 1.0a user-context signing (the
 * standard pattern for a long-lived server-side posting bot — API
 * key/secret + access token/secret, all non-expiring). Behind a flag and
 * never wired into any automatic trigger — see MASTER_PROMPT section 23:
 * v1 distribution is "site, RSS, X, Telegram", explicitly opt-in.
 *
 * NOT tested against the real API — no X developer account/credentials
 * exist in this environment (X API access is a paid decision the user
 * must make, not something to provision without asking). See CLAUDE.md.
 */

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key] ?? "")}`)
    .join("&");
  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(sortedParams)].join("&");
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return createHmac("sha1", signingKey).update(baseString).digest("base64");
}

function buildAuthHeader(params: Record<string, string>): string {
  return (
    "OAuth " +
    Object.keys(params)
      .sort()
      .map((key) => `${percentEncode(key)}="${percentEncode(params[key] ?? "")}"`)
      .join(", ")
  );
}

export const xAdapter: DistributionAdapter = {
  channel: "x",

  isEnabled: () =>
    process.env.DISTRIBUTION_X_ENABLED === "true" &&
    Boolean(
      process.env.X_API_KEY &&
        process.env.X_API_SECRET &&
        process.env.X_ACCESS_TOKEN &&
        process.env.X_ACCESS_SECRET,
    ),

  post: async (article, siteUrl) => {
    if (!xAdapter.isEnabled()) {
      return { status: "disabled" };
    }

    const consumerKey = process.env.X_API_KEY as string;
    const consumerSecret = process.env.X_API_SECRET as string;
    const token = process.env.X_ACCESS_TOKEN as string;
    const tokenSecret = process.env.X_ACCESS_SECRET as string;
    const url = "https://api.twitter.com/2/tweets";

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: randomBytes(16).toString("hex"),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: token,
      oauth_version: "1.0",
    };
    oauthParams.oauth_signature = buildSignature("POST", url, oauthParams, consumerSecret, tokenSecret);

    const text = `${article.title}\n\n${siteUrl}/${article.locale}/${article.slug}`.slice(0, 280);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: buildAuthHeader(oauthParams),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      const body = (await res.json()) as { data?: { id?: string }; detail?: string };

      if (!res.ok) {
        return { status: "error", errorMessage: `${res.status} ${body.detail ?? JSON.stringify(body)}` };
      }

      return {
        status: "posted",
        externalPostId: body.data?.id,
        externalUrl: body.data?.id ? `https://x.com/i/web/status/${body.data.id}` : undefined,
      };
    } catch (err) {
      return { status: "error", errorMessage: err instanceof Error ? err.message : String(err) };
    }
  },
};
