export type Channel = "x" | "telegram" | "instagram";

export interface DistributionResult {
  status: "posted" | "disabled" | "error";
  externalPostId?: string;
  externalUrl?: string;
  errorMessage?: string;
}

export interface ArticleForDistribution {
  title: string;
  slug: string;
  locale: "ar" | "fr";
}

export interface DistributionAdapter {
  channel: Channel;
  isEnabled: () => boolean;
  post: (article: ArticleForDistribution, siteUrl: string) => Promise<DistributionResult>;
}

// Separate shape from ArticleForDistribution on purpose — this is a raw
// radar item (src/workers/instagram-publish.ts), not an AI-written article:
// no slug of our own, the link readers actually want is the ORIGINAL
// article, and a photo is required (Instagram has no text-only post type).
export interface RadarItemForDistribution {
  title: string;
  sourceName: string;
  originalUrl: string;
  imageUrl: string;
  locale: "ar" | "fr";
}

export interface ImageDistributionAdapter {
  channel: Channel;
  isEnabled: () => boolean;
  postImage: (item: RadarItemForDistribution, siteUrl: string) => Promise<DistributionResult>;
}
