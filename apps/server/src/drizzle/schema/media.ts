import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { userTable } from "./user";

export const mediaTable = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    thumbnail: text("thumbnail").notNull(),
    userId: uuid("user_id")
      .references(() => userTable.id)
      .notNull(),
    category: text("category").notNull(),
  },
  (table) => {
    return {
      mediaOwnerIdx: index("media_owner_idx").on(table.userId),
    };
  }
);

export const mediaInfoTable = pgTable(
  "media-info",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    mediaId: uuid("media_id")
      .references(() => mediaTable.id)
      .notNull(),
    views: integer("view").default(0).notNull(),
    mediaType: text("media_type").notNull(),
    isSummarized: boolean("is_summarized").default(false).notNull(),
  },
  (table) => {
    return {
      mediaIdx: index("media_idx").on(table.mediaId),
    };
  }
);
