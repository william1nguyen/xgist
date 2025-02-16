import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { userTable } from "./user";
import { commonFields } from "./base";

export const videoTable = pgTable(
  "video",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    transcripts: jsonb("transcripts").$type<string[]>().default([]),
    tags: jsonb("tags").$type<string[]>().default([]),
    url: text("url").notNull(),
    userId: uuid("user_id")
      .references(() => userTable.id)
      .notNull(),
    ...commonFields,
  },
  (table) => {
    return {
      authorIdx: index("author_fk_idx").on(table.userId),
    };
  }
);
