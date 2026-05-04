CREATE TABLE "optimizer_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"outcome_weight" integer DEFAULT 70 NOT NULL,
	"partner_weight" integer DEFAULT 30 NOT NULL,
	"require_price_competitiveness" boolean DEFAULT true NOT NULL,
	"max_price_delta_pct" integer,
	"enforce_locked_qualifier_fit" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "optimizer_policies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "optimizer_policy_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"change_summary" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_promotion_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"rule_type" text NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "optimizer_policy_audit_log" ADD CONSTRAINT "optimizer_policy_audit_log_policy_id_optimizer_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."optimizer_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_promotion_rules" ADD CONSTRAINT "partner_promotion_rules_policy_id_optimizer_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."optimizer_policies"("id") ON DELETE cascade ON UPDATE no action;