CREATE TABLE "fact_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"claims" jsonb NOT NULL,
	"sources" jsonb NOT NULL,
	"entities" jsonb,
	"timeline" jsonb,
	"contradictions" jsonb,
	"confidence" integer,
	"unresolved_notes" text,
	"publication_restrictions" jsonb,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "valid_from" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "valid_to" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "source_items" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "source_items" ADD COLUMN "connector_version" text;--> statement-breakpoint
ALTER TABLE "source_items" ADD COLUMN "lineage_type" text;--> statement-breakpoint
ALTER TABLE "source_items" ADD COLUMN "derived_from_source_item_id" uuid;--> statement-breakpoint
ALTER TABLE "fact_packs" ADD CONSTRAINT "fact_packs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fact_packs_event_id_idx" ON "fact_packs" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fact_packs_event_version_idx" ON "fact_packs" USING btree ("event_id","version");--> statement-breakpoint
CREATE INDEX "fact_packs_status_idx" ON "fact_packs" USING btree ("status");