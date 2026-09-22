CREATE TABLE "ad_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"creative_id" uuid NOT NULL,
	"name" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"budget_usd" numeric(10, 2),
	"spent_usd" numeric(10, 2) DEFAULT '0',
	"max_impressions" integer,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"placements" jsonb DEFAULT '["homepage"]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creative_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid,
	"placement" text NOT NULL,
	"target_url" text NOT NULL,
	"device_type" text,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"domain" text NOT NULL,
	"description" text,
	"activity" text,
	"logo_url" text,
	"website" text,
	"contact" jsonb,
	"social_links" jsonb,
	"services" jsonb DEFAULT '[]'::jsonb,
	"products" jsonb DEFAULT '[]'::jsonb,
	"tone" text DEFAULT 'professional',
	"primary_color" text DEFAULT '#1a1a2e',
	"secondary_color" text DEFAULT '#e94560',
	"images" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'company' NOT NULL,
	"authorization_confirmed" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_cost_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"creative_id" uuid,
	"action" text NOT NULL,
	"provider" text NOT NULL,
	"cost_usd" numeric(10, 4) NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_creatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'generating' NOT NULL,
	"format" text DEFAULT 'horizontal' NOT NULL,
	"duration_ms" integer DEFAULT 10000 NOT NULL,
	"script" jsonb,
	"video_url" text,
	"thumbnail_url" text,
	"player_data" jsonb,
	"headline" text,
	"subheadline" text,
	"body" text,
	"cta" text,
	"cta_url" text,
	"rejection_reason" text,
	"error_message" text,
	"generation_cost_usd" numeric(10, 4),
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_impressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creative_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid,
	"placement" text NOT NULL,
	"device_type" text,
	"user_agent" text,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"format" text DEFAULT 'horizontal' NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"selector" text,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_company_id_ad_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."ad_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_creative_id_ad_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."ad_creatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_creative_id_ad_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."ad_creatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_company_id_ad_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."ad_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_cost_log" ADD CONSTRAINT "ad_cost_log_company_id_ad_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."ad_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_cost_log" ADD CONSTRAINT "ad_cost_log_creative_id_ad_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."ad_creatives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_company_id_ad_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."ad_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_creative_id_ad_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."ad_creatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_company_id_ad_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."ad_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_campaigns_company_id_idx" ON "ad_campaigns" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ad_campaigns_status_idx" ON "ad_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_campaigns_starts_at_idx" ON "ad_campaigns" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "ad_clicks_creative_id_idx" ON "ad_clicks" USING btree ("creative_id");--> statement-breakpoint
CREATE INDEX "ad_clicks_campaign_id_idx" ON "ad_clicks" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "ad_clicks_created_at_idx" ON "ad_clicks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ad_companies_status_idx" ON "ad_companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_companies_domain_idx" ON "ad_companies" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "ad_cost_log_company_id_idx" ON "ad_cost_log" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ad_cost_log_created_at_idx" ON "ad_cost_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ad_creatives_company_id_idx" ON "ad_creatives" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ad_creatives_status_idx" ON "ad_creatives" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_impressions_creative_id_idx" ON "ad_impressions" USING btree ("creative_id");--> statement-breakpoint
CREATE INDEX "ad_impressions_company_id_idx" ON "ad_impressions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ad_impressions_campaign_id_idx" ON "ad_impressions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "ad_impressions_created_at_idx" ON "ad_impressions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ad_placements_slug_idx" ON "ad_placements" USING btree ("slug");