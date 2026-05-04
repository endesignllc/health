ALTER TABLE "cart_items" ADD COLUMN "option_selection_confirmed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "option_selection_label" text;