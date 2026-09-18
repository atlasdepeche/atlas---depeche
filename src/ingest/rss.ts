import Parser from "rss-parser";
import { politeFetch } from "./fetch-utils";
import type { RawItem } from "./types";

const parser = new Parser();

export async function fetchRssItems(feedUrl: string): Promise<RawItem[]> {
  const xml = await politeFetch(feedUrl);
  const feed = await parser.parseString(xml);

  return (feed.items ?? []).map((item): RawItem => {
    const url = item.link ?? feedUrl;
    return {
      externalId: item.guid ?? url,
      url,
      title: (item.title ?? "(untitled)").trim(),
      summary: item.contentSnippet?.trim() || item.content?.trim() || undefined,
      publishedAt: item.isoDate ? new Date(item.isoDate) : undefined,
    };
  });
}
