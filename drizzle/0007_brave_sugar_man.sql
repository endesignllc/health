ALTER TABLE "products" ADD COLUMN "sources" text[];--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "catalog_count" integer DEFAULT 1 NOT NULL;