import { relations } from "drizzle-orm/relations";
import { comments, likes, users, video } from "./schema";

export const videoRelations = relations(video, ({ one, many }) => ({
  user: one(users, {
    fields: [video.userId],
    references: [users.id],
  }),
  comments: many(comments),
  likes: many(likes),
}));

export const usersRelations = relations(users, ({ many }) => ({
  videos: many(video),
  comments: many(comments),
  likes: many(likes),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  video: one(video, {
    fields: [comments.videoId],
    references: [video.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  video: one(video, {
    fields: [likes.videoId],
    references: [video.id],
  }),
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));
