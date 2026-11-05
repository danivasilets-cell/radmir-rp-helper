CREATE TABLE "news" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"server_id" integer,
	"author_label" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "news_created_idx" ON "news" ("created_at");--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_server_id_game_servers_id_fkey" FOREIGN KEY ("server_id") REFERENCES "game_servers"("id") ON DELETE SET NULL;