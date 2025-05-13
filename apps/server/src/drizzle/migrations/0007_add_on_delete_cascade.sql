ALTER TABLE "ai_presenter" DROP CONSTRAINT "ai_presenter_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_presenter" DROP CONSTRAINT "ai_presenter_media_id_media_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_presenter" DROP CONSTRAINT "ai_presenter_agent_id_agent_id_fk";
--> statement-breakpoint
ALTER TABLE "chunk" DROP CONSTRAINT "chunk_transcript_id_transcript_id_fk";
--> statement-breakpoint
ALTER TABLE "keypoint" DROP CONSTRAINT "keypoint_media_id_media_id_fk";
--> statement-breakpoint
ALTER TABLE "keypoint" DROP CONSTRAINT "keypoint_transcript_id_transcript_id_fk";
--> statement-breakpoint
ALTER TABLE "keyword" DROP CONSTRAINT "keyword_media_id_media_id_fk";
--> statement-breakpoint
ALTER TABLE "keyword" DROP CONSTRAINT "keyword_transcript_id_transcript_id_fk";
--> statement-breakpoint
ALTER TABLE "media_bookmark" DROP CONSTRAINT "media_bookmark_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "media_bookmark" DROP CONSTRAINT "media_bookmark_media_id_media_id_fk";
--> statement-breakpoint
ALTER TABLE "media-info" DROP CONSTRAINT "media-info_media_id_media_id_fk";
--> statement-breakpoint
ALTER TABLE "media_like" DROP CONSTRAINT "media_like_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "media_like" DROP CONSTRAINT "media_like_media_id_media_id_fk";
--> statement-breakpoint
ALTER TABLE "summary" DROP CONSTRAINT "summary_media_id_media_id_fk";
--> statement-breakpoint
ALTER TABLE "summary" DROP CONSTRAINT "summary_transcript_id_transcript_id_fk";
--> statement-breakpoint
ALTER TABLE "transcript" DROP CONSTRAINT "transcript_media_id_media_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_presenter" ADD CONSTRAINT "ai_presenter_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_presenter" ADD CONSTRAINT "ai_presenter_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_presenter" ADD CONSTRAINT "ai_presenter_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk" ADD CONSTRAINT "chunk_transcript_id_transcript_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcript"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keypoint" ADD CONSTRAINT "keypoint_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keypoint" ADD CONSTRAINT "keypoint_transcript_id_transcript_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcript"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword" ADD CONSTRAINT "keyword_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword" ADD CONSTRAINT "keyword_transcript_id_transcript_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcript"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_bookmark" ADD CONSTRAINT "media_bookmark_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_bookmark" ADD CONSTRAINT "media_bookmark_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media-info" ADD CONSTRAINT "media-info_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_like" ADD CONSTRAINT "media_like_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_like" ADD CONSTRAINT "media_like_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summary" ADD CONSTRAINT "summary_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summary" ADD CONSTRAINT "summary_transcript_id_transcript_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcript"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript" ADD CONSTRAINT "transcript_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;