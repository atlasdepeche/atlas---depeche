export interface RawItem {
  /** RSS guid/link, or a content hash for the generic HTML connector.
   *  Unique per source — see src/db/schema.ts `source_items`. */
  externalId: string;
  url: string;
  title: string;
  summary?: string;
  publishedAt?: Date;
}
