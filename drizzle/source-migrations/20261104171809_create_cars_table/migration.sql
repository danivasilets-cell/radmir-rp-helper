CREATE TABLE "cars" (
	"id" serial PRIMARY KEY,
	"model_id" integer NOT NULL,
	"name" text NOT NULL,
	"car_class" text NOT NULL,
	"price" bigint,
	"dealership" text DEFAULT '' NOT NULL,
	"max_speed" integer DEFAULT 0 NOT NULL,
	"acceleration" real DEFAULT 0 NOT NULL,
	"power" integer DEFAULT 0 NOT NULL,
	"seats" integer DEFAULT 4 NOT NULL,
	"trunk" integer DEFAULT 0 NOT NULL,
	"fuel_tank" integer DEFAULT 0 NOT NULL,
	"drive" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cars_model_id_idx" ON "cars" ("model_id");--> statement-breakpoint
CREATE INDEX "cars_class_idx" ON "cars" ("car_class");