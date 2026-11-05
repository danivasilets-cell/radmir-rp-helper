CREATE TABLE "quick_links" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
