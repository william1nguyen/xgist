CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"created_time" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp with time zone,
	"deleted_time" timestamp with time zone,
	"created_by" jsonb,
	"updated_by" jsonb,
	"deleted_by" jsonb
);
--> statement-breakpoint
CREATE TABLE "video" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"thumbnail_url" text,
	"transcripts" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"views" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"author_id" uuid,
	"created_time" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp with time zone,
	"deleted_time" timestamp with time zone,
	"created_by" jsonb,
	"updated_by" jsonb,
	"deleted_by" jsonb
);
--> statement-breakpoint
ALTER TABLE "video" ADD CONSTRAINT "video_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;