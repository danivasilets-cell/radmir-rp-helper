CREATE TABLE "event_prizes" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"reward" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"event_date" date,
	"winner" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_tables" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"columns" jsonb DEFAULT '[]' NOT NULL,
	"rows" jsonb DEFAULT '[]' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
