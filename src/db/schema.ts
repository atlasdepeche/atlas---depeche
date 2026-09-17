/**
 * Phase 0 schema — just enough to prove the migration pipeline and to give
 * later phases (ingest, verification, editorial) a real foundation.
 *
 * Full model (claims, evidence, agent_runs, audit_logs, etc. — see
 * docs/MASTER_PROMPT.md section 15) lands incrementally in Phase 1/2.
 */
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// --- sources ---------------------------------------------------------

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").notNull(), // rss | api | html | document | social
    url: text("url").notNull(),
    language: text("language").notNull(), // ar | fr | en
    country: text("country").notNull().default("MA"),
    category: text("category"),
    pollingFrequencySeconds: integer("polling_frequency_seconds"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastErrorMessage: text("last_error_message"),
    status: text("status").notNull().default("active"), // active | paused | error
    robotsPolicy: text("robots_policy"),
    tosNotes: text("tos_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sources_url_idx").on(table.url),
    index("sources_status_idx").on(table.status),
  ],
);

// --- events ------------------------------------------------------------

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    location: text("location"),
    detectedAt: timestamp("detected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    // candidate | verifying | verified | rejected | published | updated
    status: text("status").notNull().default("candidate"),
    // breaking | developing | important | routine
    priority: text("priority").notNull().default("routine"),
    confidenceInternal: integer("confidence_internal"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("events_detected_at_idx").on(table.detectedAt),
    index("events_status_idx").on(table.status),
    index("events_category_idx").on(table.category),
  ],
);

// --- articles ------------------------------------------------------------

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(), // ar | fr
    // draft | verifying | verified | review | approved | published |
    // updated | corrected | archived
    status: text("status").notNull().default("draft"),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    body: text("body").notNull().default(""),
    // shadow | assisted | automated | human_only — the mode this article
    // was produced under, for audit (see src/lib/publication-mode.ts).
    publicationMode: text("publication_mode").notNull().default("shadow"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("articles_locale_slug_idx").on(table.locale, table.slug),
    index("articles_event_id_idx").on(table.eventId),
    index("articles_status_idx").on(table.status),
    index("articles_locale_idx").on(table.locale),
  ],
);
