import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { commonFields } from "./base";
import { userTable } from "./user";
import { videoTable } from "./video";

export const commentTable = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    content: text("content").notNull(),
    videoId: uuid("video_id")
      .references(() => videoTable.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => userTable.id)
      .notNull(),
    ...commonFields,
  },
  (table) => {
    return {
      videoIdx: index("comment_video_fk_idx").on(table.videoId),
      userIdx: index("comment_user_fk_idx").on(table.userId),
    };
  }
);
