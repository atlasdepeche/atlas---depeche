/**
 * Advertising module schema — completely isolated from editorial tables.
 * These tables are imported by schema.ts for Drizzle migration generation,
 * but have ZERO foreign-key relationships to editorial tables (events,
 * articles, sources, etc.). The advertising module is a standalone system.
 *
 * Added 2026-09-22 — Phase 1 (trial): 2–5 companies, ~10s video ads,
 * manual review, campaign rotation, basic stats.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// --- ad_companies ------------------------------------------------------------

export const adCompanies = pgTable(
  "ad_companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    domain: text("domain").notNull(),
    description: text("description"),
    activity: text("activity"),
    logoUrl: text("logo_url"),
    website: text("website"),
    contact: jsonb("contact").$type<{
      phone: string | null;
      email: string | null;
      address: string | null;
    }>(),
    socialLinks: jsonb("social_links").$type<Record<string, string>>(),
    services: jsonb("services").$type<string[]>().default([]),
    products: jsonb("products").$type<string[]>().default([]),
    tone: text("tone").default("professional"),
    primaryColor: text("primary_color").default("#1a1a2e"),
    secondaryColor: text("secondary_color").default("#e94560"),
    images: jsonb("images").$type<string[]>().default([]),
    // company | paused
    status: text("status").notNull().default("company"),
    authorizationConfirmed: boolean("authorization_confirmed").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ad_companies_status_idx").on(table.status),
    index("ad_companies_domain_idx").on(table.domain),
  ],
);

// --- ad_creatives (individual ads / video versions) --------------------------

export const adCreatives = pgTable(
  "ad_creatives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => adCompanies.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    // generating | pending_review | approved | scheduled | published |
    // paused | rejected | error
    status: text("status").notNull().default("generating"),
    // horizontal | vertical | square
    format: text("format").notNull().default("horizontal"),
    durationMs: integer("duration_ms").notNull().default(10000),
    // Ad creative data (script, scenes, elements)
    script: jsonb("script"),
    // Generated video file path (relative to public/ads/)
    videoUrl: text("video_url"),
    thumbnailUrl: text("thumbnail_url"),
    // HTML5 ad player data (for the template-based renderer)
    playerData: jsonb("player_data"),
    headline: text("headline"),
    subheadline: text("subheadline"),
    body: text("body"),
    cta: text("cta"),
    ctaUrl: text("cta_url"),
    // Rejection / error info
    rejectionReason: text("rejection_reason"),
    errorMessage: text("error_message"),
    // Cost tracking
    generationCostUsd: numeric("generation_cost_usd", {
      precision: 10,
      scale: 4,
    }),
    // Who approved/rejected
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ad_creatives_company_id_idx").on(table.companyId),
    index("ad_creatives_status_idx").on(table.status),
  ],
);

// --- ad_campaigns ------------------------------------------------------------

export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => adCompanies.id, { onDelete: "cascade" }),
    creativeId: uuid("creative_id")
      .notNull()
      .references(() => adCreatives.id, { onDelete: "cascade" }),
    name: text("name"),
    // draft | scheduled | active | paused | completed | cancelled
    status: text("status").notNull().default("draft"),
    // low | normal | high | urgent
    priority: text("priority").notNull().default("normal"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    // Budget / cost control
    budgetUsd: numeric("budget_usd", { precision: 10, scale: 2 }),
    spentUsd: numeric("spent_usd", { precision: 10, scale: 2 }).default("0"),
    maxImpressions: integer("max_impressions"),
    // Stats (denormalized for fast reads)
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    // Which sections to show in
    placements: jsonb("placements")
      .$type<string[]>()
      .default(["homepage"]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ad_campaigns_company_id_idx").on(table.companyId),
    index("ad_campaigns_status_idx").on(table.status),
    index("ad_campaigns_starts_at_idx").on(table.startsAt),
  ],
);

// --- ad_placements (where ads appear on the site) ----------------------------

export const adPlacements = pgTable(
  "ad_placements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // e.g. "homepage", "article_page", "section_news", "sidebar"
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // horizontal | vertical | square
    format: text("format").notNull().default("horizontal"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    // CSS selector or section identifier for insertion
    selector: text("selector"),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ad_placements_slug_idx").on(table.slug),
  ],
);

// --- ad_impressions (tracking) -----------------------------------------------

export const adImpressions = pgTable(
  "ad_impressions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creativeId: uuid("creative_id")
      .notNull()
      .references(() => adCreatives.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => adCompanies.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => adCampaigns.id, {
      onDelete: "set null",
    }),
    placement: text("placement").notNull(),
    deviceType: text("device_type"), // mobile | tablet | desktop
    userAgent: text("user_agent"),
    country: text("country"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ad_impressions_creative_id_idx").on(table.creativeId),
    index("ad_impressions_company_id_idx").on(table.companyId),
    index("ad_impressions_campaign_id_idx").on(table.campaignId),
    index("ad_impressions_created_at_idx").on(table.createdAt),
  ],
);

// --- ad_clicks (tracking) ----------------------------------------------------

export const adClicks = pgTable(
  "ad_clicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creativeId: uuid("creative_id")
      .notNull()
      .references(() => adCreatives.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => adCompanies.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => adCampaigns.id, {
      onDelete: "set null",
    }),
    placement: text("placement").notNull(),
    targetUrl: text("target_url").notNull(),
    deviceType: text("device_type"),
    country: text("country"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ad_clicks_creative_id_idx").on(table.creativeId),
    index("ad_clicks_campaign_id_idx").on(table.campaignId),
    index("ad_clicks_created_at_idx").on(table.createdAt),
  ],
);

// --- ad_cost_log (spend tracking) -------------------------------------------

export const adCostLog = pgTable(
  "ad_cost_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => adCompanies.id, { onDelete: "cascade" }),
    creativeId: uuid("creative_id").references(() => adCreatives.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // generate | regenerate | analyze
    provider: text("provider").notNull(), // template | veo | runway | etc.
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ad_cost_log_company_id_idx").on(table.companyId),
    index("ad_cost_log_created_at_idx").on(table.createdAt),
  ],
);
