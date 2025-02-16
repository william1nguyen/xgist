import { index, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { commonFields } from "./base";
import { userTable } from "./user";
import { videoTable } from "./video";

export const likeTable = pgTable(
  "likes",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
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
      videoIdx: index("like_video_fk_idx").on(table.videoId),
      userIdx: index("like_user_fk_idx").on(table.userId),
      likeConstraint: unique("like_constraint").on(table.userId, table.videoId),
    };
  }
);
