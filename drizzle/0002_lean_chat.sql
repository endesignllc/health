CREATE TABLE "product_class_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_class_id" uuid NOT NULL,
	"alias" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_class_price_stats" (
	"product_class_id" uuid PRIMARY KEY NOT NULL,
	"sample_count" integer NOT NULL,
	"min_cents" integer,
	"max_cents" integer,
	"trimmed_median_cents" integer,
	"p25_cents" integer,
	"p75_cents" integer,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"canonical_name" text NOT NULL,
	"description" text,
	"need_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_classes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_price_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_class_id" uuid NOT NULL,
	"retailer" text,
	"normalized_title" text,
	"price_cents" integer NOT NULL,
	"source_url" text,
	"external_item_id" text,
	"observed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualifier_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualifier_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_class_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"prompt" text NOT NULL,
	"help_text" text,
	"kind" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualifier_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"effect" text NOT NULL,
	"match_tag" text,
	"match_product_id" uuid,
	"weight" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"scheduled_ship_at" timestamp NOT NULL,
	"notify_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending_notify' NOT NULL,
	"bundle_snapshot" jsonb,
	"member_email" text,
	"stripe_invoice_id" text,
	"response_token" text NOT NULL,
	"notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_shipments_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id"),
	CONSTRAINT "subscription_shipments_response_token_unique" UNIQUE("response_token")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_class_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "external_product_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "in_stock" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "restock_eta_hours" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "units_per_package" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "estimated_daily_use" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "vendor" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "alternate_skus" text[];--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "member_email" text;--> statement-breakpoint
ALTER TABLE "product_class_aliases" ADD CONSTRAINT "product_class_aliases_product_class_id_product_classes_id_fk" FOREIGN KEY ("product_class_id") REFERENCES "public"."product_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_class_price_stats" ADD CONSTRAINT "product_class_price_stats_product_class_id_product_classes_id_fk" FOREIGN KEY ("product_class_id") REFERENCES "public"."product_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_classes" ADD CONSTRAINT "product_classes_need_id_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."needs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_observations" ADD CONSTRAINT "product_price_observations_product_class_id_product_classes_id_fk" FOREIGN KEY ("product_class_id") REFERENCES "public"."product_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualifier_options" ADD CONSTRAINT "qualifier_options_question_id_qualifier_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."qualifier_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualifier_questions" ADD CONSTRAINT "qualifier_questions_product_class_id_product_classes_id_fk" FOREIGN KEY ("product_class_id") REFERENCES "public"."product_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualifier_rules" ADD CONSTRAINT "qualifier_rules_option_id_qualifier_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."qualifier_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualifier_rules" ADD CONSTRAINT "qualifier_rules_match_product_id_products_id_fk" FOREIGN KEY ("match_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_shipments" ADD CONSTRAINT "subscription_shipments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_class_aliases_alias_lower" ON "product_class_aliases" USING btree (lower("alias"));--> statement-breakpoint
CREATE UNIQUE INDEX "qualifier_options_question_slug_uq" ON "qualifier_options" USING btree ("question_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "qualifier_questions_class_slug_uq" ON "qualifier_questions" USING btree ("product_class_id","slug");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_class_id_product_classes_id_fk" FOREIGN KEY ("product_class_id") REFERENCES "public"."product_classes"("id") ON DELETE set null ON UPDATE no action;