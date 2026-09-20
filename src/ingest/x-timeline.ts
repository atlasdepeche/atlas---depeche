import type { RawItem } from "./types";

/**
 * A curated personality/organization X (Twitter) account — requested
 * directly: automatically pull in posts from Moroccan footballers, the
 * federation, and international orgs/personalities who talk about
 * Morocco. Unlike the RSS/html_list sources, this list lives in code
 * (like SEED_SOURCES) rather than being resolved by URL — the numeric
 * user id is needed for the v2 timeline endpoint and was resolved once
 * by hand (via GET /2/users/by) against the real API, not guessed.
 *
 * Handles NOT on this list were tried and rejected 2026-09-20 after
 * resolving via the real API and finding them fake/squatted (0-500
 * followers, empty bios, 0-3 tweets — not the real person): Yassine
 * Bounou (@bono, @YassineBounou, @ybounou all fake), Hakim Ziyech
 * (@HakimZiyech, @hakimziyech10, @ziyech22 all fake), Sofyan Amrabat
 * (@sofyanamrabat, @SAmrabat4, @Samrabat all fake/not found), Noussair
 * Mazraoui, Mohamed Ouahbi — none of the plausible handle patterns
 * resolved to a real account. Better to ship fewer real accounts than
 * one wrong one showing an unrelated stranger's tweets as theirs.
 */
export interface XAccount {
  username: string;
  userId: string;
  language: "ar" | "fr";
  displayName: string;
}

export const X_ACCOUNTS: XAccount[] = [
  { username: "AchrafHakimi", userId: "279581853", language: "fr", displayName: "Achraf Hakimi" },
  { username: "Ayoub_ElKaabi", userId: "966082964500119553", language: "fr", displayName: "Ayoub El Kaabi" },
  { username: "FRMFOFFICIEL", userId: "1336279154", language: "fr", displayName: "FRMF" },
  { username: "caf_online_FR", userId: "1903309664", language: "fr", displayName: "CAF (Français)" },
  { username: "caf_online_AR", userId: "1903298402", language: "ar", displayName: "CAF (Arabe)" },
  { username: "beINSPORTS", userId: "576241232", language: "ar", displayName: "beIN SPORTS" },
];

const API_BASE = "https://api.x.com/2";

// Once per account per day (see .github/workflows/x-personalities.yml) — at
// 5 tweets/account that's 30 post-reads/day, ~900/month, well inside the
// $5 hard spend cap set on the X developer account (~1000 reads/month at
// $0.005 each) with real margin for the occasional retry.
const TWEETS_PER_ACCOUNT = 5;

interface XApiMedia {
  media_key: string;
  url?: string;
  preview_image_url?: string;
}

interface XApiTweet {
  id: string;
  text: string;
  created_at?: string;
  attachments?: { media_keys?: string[] };
}

export async function fetchXTimelineItems(account: XAccount): Promise<RawItem[]> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    throw new Error("X_BEARER_TOKEN not set — see .github/workflows/x-personalities.yml");
  }

  const url =
    `${API_BASE}/users/${account.userId}/tweets` +
    `?max_results=${TWEETS_PER_ACCOUNT}` +
    `&exclude=replies,retweets` +
    `&tweet.fields=created_at,attachments` +
    `&expansions=attachments.media_keys` +
    `&media.fields=url,preview_image_url`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`X API ${res.status} for @${account.username}: ${await res.text()}`);
  }

  const body = (await res.json()) as {
    data?: XApiTweet[];
    includes?: { media?: XApiMedia[] };
  };

  const mediaByKey = new Map((body.includes?.media ?? []).map((m) => [m.media_key, m]));

  return (body.data ?? []).map((tweet): RawItem => {
    const mediaKey = tweet.attachments?.media_keys?.[0];
    const media = mediaKey ? mediaByKey.get(mediaKey) : undefined;

    return {
      externalId: tweet.id,
      url: `https://x.com/${account.username}/status/${tweet.id}`,
      title: tweet.text,
      publishedAt: tweet.created_at ? new Date(tweet.created_at) : undefined,
      imageUrl: media?.url ?? media?.preview_image_url,
    };
  });
}
