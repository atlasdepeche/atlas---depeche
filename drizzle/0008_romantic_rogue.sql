ALTER TABLE "social_posts" ALTER COLUMN "article_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "social_posts" ADD COLUMN "source_item_id" uuid;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_source_item_id_source_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."source_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "social_posts_source_item_channel_idx" ON "social_posts" USING btree ("source_item_id","channel");