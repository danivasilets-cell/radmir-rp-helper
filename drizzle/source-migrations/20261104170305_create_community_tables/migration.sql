CREATE TABLE "comments" (
	"id" serial PRIMARY KEY,
	"node_id" integer NOT NULL,
	"user_id" integer,
	"author_name" text NOT NULL,
	"author_role" text DEFAULT 'user' NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" integer,
	"node_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_pkey" PRIMARY KEY("user_id","node_id")
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"section_id" integer,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_note" text DEFAULT '' NOT NULL,
	"reviewed_by" text DEFAULT '' NOT NULL,
	"node_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"node_id" integer,
	"user_id" integer,
	"value" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_pkey" PRIMARY KEY("node_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"nickname" text NOT NULL,
	"password_hash" text NOT NULL,
	"faction" text DEFAULT '' NOT NULL,
	"server" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_id" integer;--> statement-breakpoint
CREATE INDEX "comments_node_idx" ON "comments" ("node_id");--> statement-breakpoint
CREATE INDEX "comments_user_idx" ON "comments" ("user_id");--> statement-breakpoint
CREATE INDEX "ideas_status_idx" ON "ideas" ("status");--> statement-breakpoint
CREATE INDEX "ideas_user_idx" ON "ideas" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_nickname_lower" ON "users" (lower("nickname"));--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_node_id_nodes_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_node_id_nodes_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_section_id_nodes_id_fkey" FOREIGN KEY ("section_id") REFERENCES "nodes"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_node_id_nodes_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_node_id_nodes_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;