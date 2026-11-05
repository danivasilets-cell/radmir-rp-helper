ALTER TABLE "cars" ADD COLUMN "image" text DEFAULT '' NOT NULL;--> statement-breakpoint
DROP INDEX "cars_model_id_idx";--> statement-breakpoint
CREATE INDEX "cars_model_id_idx" ON "cars" ("model_id");