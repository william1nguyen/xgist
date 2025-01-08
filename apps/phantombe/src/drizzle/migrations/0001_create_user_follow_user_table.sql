CREATE TABLE IF NOT EXISTS "user_follow_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" text NOT NULL,
	"followed_id" text NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "video_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_follow" ON "user_follow_user" USING btree ("follower_id","followed_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_like" ON "user_like_video" USING btree ("user_id","video_id");