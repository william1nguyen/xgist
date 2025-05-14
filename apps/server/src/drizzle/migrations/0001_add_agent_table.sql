CREATE TYPE "public"."voice" AS ENUM('en-US-AvaMultilingualNeural', 'en-US-CoraMultilingualNeural', 'en-US-NovaTurboMultilingualNeural', 'en-US-AndrewMultilingualNeural', 'en-US-ChristopherMultilingualNeural', 'en-US-BrandonMultilingualNeural');--> statement-breakpoint
CREATE TABLE "agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"avatarUrl" text NOT NULL,
	"voice_id" "voice" NOT NULL,
	"videoUrl" text NOT NULL,
	"created_time" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp with time zone,
	"deleted_time" timestamp with time zone
);
