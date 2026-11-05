CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY,
	"actor_role" text DEFAULT 'guest' NOT NULL,
	"actor_label" text DEFAULT '' NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"entity_type" text DEFAULT '' NOT NULL,
	"entity_id" integer,
	"summary" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_attempts" (
	"id" serial PRIMARY KEY,
	"key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_visitors" (
	"day" date,
	"visitor_hash" text,
	CONSTRAINT "daily_visitors_pkey" PRIMARY KEY("day","visitor_hash")
);
--> statement-breakpoint
CREATE TABLE "favorite_cars" (
	"user_id" integer,
	"car_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_cars_pkey" PRIMARY KEY("user_id","car_id")
);
--> statement-breakpoint
CREATE TABLE "game_commands" (
	"id" serial PRIMARY KEY,
	"command" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"usage" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"server_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_servers" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"kind" text DEFAULT 'gov' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"leader" text DEFAULT '' NOT NULL,
	"server_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"day" date,
	"path" text,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "page_views_pkey" PRIMARY KEY("day","path")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY,
	"reporter_id" integer,
	"reporter_name" text DEFAULT '' NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"target_title" text DEFAULT '' NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text DEFAULT '' NOT NULL,
	"handled_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"handled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "roleplays" (
	"id" serial PRIMARY KEY,
	"kind" text DEFAULT 'action' NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"organization_id" integer,
	"server_id" integer,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_roleplays" (
	"user_id" integer,
	"roleplay_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_roleplays_pkey" PRIMARY KEY("user_id","roleplay_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cars" ADD COLUMN "server_id" integer;--> statement-breakpoint
ALTER TABLE "event_prizes" ADD COLUMN "server_id" integer;--> statement-breakpoint
ALTER TABLE "event_tables" ADD COLUMN "server_id" integer;--> statement-breakpoint
ALTER TABLE "moderators" ADD COLUMN "role" text DEFAULT 'moderator' NOT NULL;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "server_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "server_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
CREATE INDEX "activity_created_idx" ON "activity_log" ("created_at");--> statement-breakpoint
CREATE INDEX "activity_user_idx" ON "activity_log" ("user_id");--> statement-breakpoint
CREATE INDEX "auth_attempts_key_idx" ON "auth_attempts" ("key","created_at");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" ("status");--> statement-breakpoint
CREATE INDEX "roleplays_kind_idx" ON "roleplays" ("kind");--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_server_id_game_servers_id_fkey" FOREIGN KEY ("server_id") REFERENCES "game_servers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "event_prizes" ADD CONSTRAINT "event_prizes_server_id_game_servers_id_fkey" FOREIGN KEY ("server_id") REFERENCES "game_servers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "event_tables" ADD CONSTRAINT "event_tables_server_id_game_servers_id_fkey" FOREIGN KEY ("server_id") REFERENCES "game_servers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "favorite_cars" ADD CONSTRAINT "favorite_cars_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "favorite_cars" ADD CONSTRAINT "favorite_cars_car_id_cars_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "game_commands" ADD CONSTRAINT "game_commands_server_id_game_servers_id_fkey" FOREIGN KEY ("server_id") REFERENCES "game_servers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_server_id_game_servers_id_fkey" FOREIGN KEY ("server_id") REFERENCES "game_servers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_server_id_game_servers_id_fkey" FOREIGN KEY ("server_id") REFERENCES "game_servers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "roleplays" ADD CONSTRAINT "roleplays_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "roleplays" ADD CONSTRAINT "roleplays_server_id_game_servers_id_fkey" FOREIGN KEY ("server_id") REFERENCES "game_servers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "saved_roleplays" ADD CONSTRAINT "saved_roleplays_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "saved_roleplays" ADD CONSTRAINT "saved_roleplays_roleplay_id_roleplays_id_fkey" FOREIGN KEY ("roleplay_id") REFERENCES "roleplays"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_server_id_game_servers_id_fkey" FOREIGN KEY ("server_id") REFERENCES "game_servers"("id") ON DELETE SET NULL;