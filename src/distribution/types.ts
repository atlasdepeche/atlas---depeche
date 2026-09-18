export type Channel = "x" | "telegram";

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
