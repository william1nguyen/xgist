CREATE TYPE "public"."category" AS ENUM('technology', 'education', 'productivity', 'finance', 'travel', 'health');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keycloak_user_id" uuid NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"created_time" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp with time zone,
	"deleted_time" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "video" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"thumbnail" text NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "category" DEFAULT 'technology' NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"is_summarized" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_time" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp with time zone,
	"deleted_time" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "video" ADD CONSTRAINT "video_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_fk_idx" ON "video" USING btree ("user_id");