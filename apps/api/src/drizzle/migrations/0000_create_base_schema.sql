CREATE TYPE "public"."media_state" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('DOCUMENT', 'VIDEO', 'AUDIO');--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"type" "media_type" DEFAULT 'DOCUMENT' NOT NULL,
	"state" "media_state" DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb,
	"created_time" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp with time zone,
	"deleted_time" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keycloak_user_id" uuid NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"metadata" jsonb,
	"created_time" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp with time zone,
	"deleted_time" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_idx" ON "media" USING btree ("user_id");