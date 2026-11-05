CREATE TABLE "moderators" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"key_hash" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" serial PRIMARY KEY,
	"parent_id" integer,
	"kind" text DEFAULT 'topic' NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY,
	"token_hash" text NOT NULL UNIQUE,
	"role" text NOT NULL,
	"moderator_id" integer,
	"label" text DEFAULT '' NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parent_id_nodes_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "nodes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_moderator_id_moderators_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "moderators"("id") ON DELETE CASCADE;