ALTER TABLE "product_classes" ADD COLUMN "interaction_flags" text[];--> statement-breakpoint
ALTER TABLE "product_classes" ADD COLUMN "benefit_rails" text[];--> statement-breakpoint
ALTER TABLE "product_classes" ADD COLUMN "dual_purpose" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "product_classes" ADD COLUMN "member_label" text;