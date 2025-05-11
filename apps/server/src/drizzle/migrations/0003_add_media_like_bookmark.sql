CREATE TABLE "media_bookmark" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"state" boolean
);
--> statement-breakpoint
CREATE TABLE "media_like" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"state" boolean
);
--> statement-breakpoint
ALTER TABLE "media_bookmark" ADD CONSTRAINT "media_bookmark_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_bookmark" ADD CONSTRAINT "media_bookmark_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_like" ADD CONSTRAINT "media_like_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_like" ADD CONSTRAINT "media_like_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_bookmark_actor_idx" ON "media_bookmark" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookmark_media_idx" ON "media_bookmark" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "media_like_actor_idx" ON "media_like" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "like_media_idx" ON "media_like" USING btree ("media_id");