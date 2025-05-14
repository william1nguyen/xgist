ALTER TABLE "bookmark" DROP CONSTRAINT "bookmark_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bookmark" DROP CONSTRAINT "bookmark_video_id_video_id_fk";
--> statement-breakpoint
ALTER TABLE "presenter" DROP CONSTRAINT "presenter_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "presenter" DROP CONSTRAINT "presenter_video_id_video_id_fk";
--> statement-breakpoint
ALTER TABLE "presenter" DROP CONSTRAINT "presenter_agent_id_agent_id_fk";
--> statement-breakpoint
ALTER TABLE "video_like" DROP CONSTRAINT "video_like_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "video_like" DROP CONSTRAINT "video_like_video_id_video_id_fk";
--> statement-breakpoint
ALTER TABLE "video" DROP CONSTRAINT "video_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presenter" ADD CONSTRAINT "presenter_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presenter" ADD CONSTRAINT "presenter_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presenter" ADD CONSTRAINT "presenter_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_like" ADD CONSTRAINT "video_like_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_like" ADD CONSTRAINT "video_like_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video" ADD CONSTRAINT "video_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;