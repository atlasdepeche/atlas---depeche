CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"publication_mode" text DEFAULT 'shadow' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"location" text,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurred_at" timestamp with time zone,
	"status" text DEFAULT 'candidate' NOT NULL,
	"priority" text DEFAULT 'routine' NOT NULL,
	"confidence_internal" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"language" text NOT NULL,
	"country" text DEFAULT 'MA' NOT NULL,
	"category" text,
	"polling_frequency_seconds" integer,
	"last_seen_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error_message" text,
	"status" text DEFAULT 'active' NOT NULL,
	"robots_policy" text,
	"tos_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_locale_slug_idx" ON "articles" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "articles_event_id_idx" ON "articles" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_locale_idx" ON "articles" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "events_detected_at_idx" ON "events" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_category_idx" ON "events" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_url_idx" ON "sources" USING btree ("url");--> statement-breakpoint
CREATE INDEX "sources_status_idx" ON "sources" USING btree ("status");