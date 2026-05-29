CREATE TABLE "need_qualifier_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "need_qualifier_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"need_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"prompt" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "need_qualifier_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"effect" text NOT NULL,
	"match_tag" text,
	"match_product_id" uuid,
	"match_product_class_id" uuid,
	"weight" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "needs" ADD COLUMN "priority_tier" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_everyday_essential" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "need_qualifier_options" ADD CONSTRAINT "need_qualifier_options_question_id_need_qualifier_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."need_qualifier_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_qualifier_questions" ADD CONSTRAINT "need_qualifier_questions_need_id_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."needs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_qualifier_rules" ADD CONSTRAINT "need_qualifier_rules_option_id_need_qualifier_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."need_qualifier_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_qualifier_rules" ADD CONSTRAINT "need_qualifier_rules_match_product_id_products_id_fk" FOREIGN KEY ("match_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_qualifier_rules" ADD CONSTRAINT "need_qualifier_rules_match_product_class_id_product_classes_id_fk" FOREIGN KEY ("match_product_class_id") REFERENCES "public"."product_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "need_qualifier_options_question_slug_uq" ON "need_qualifier_options" USING btree ("question_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "need_qualifier_questions_need_slug_uq" ON "need_qualifier_questions" USING btree ("need_id","slug");