import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { userTable } from "./user";
import { relations } from "drizzle-orm";

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

export const mediaLikeTable = pgTable(
  "media_like",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: uuid("user_id")
      .references(() => userTable.id)
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => mediaTable.id)
      .notNull(),
    state: boolean("state"),
  },
  (table) => {
    return {
      mediaLikeActorIdx: index("media_like_actor_idx").on(table.userId),
      likeMediaIdx: index("like_media_idx").on(table.mediaId),
    };
  }
);

export const mediaBookmarkTable = pgTable(
  "media_bookmark",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: uuid("user_id")
      .references(() => userTable.id)
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => mediaTable.id)
      .notNull(),
    state: boolean("state"),
  },
  (table) => {
    return {
      mediaBookmarkActorIdx: index("media_bookmark_actor_idx").on(table.userId),
      bookmarkmediaIdx: index("bookmark_media_idx").on(table.mediaId),
    };
  }
);

export const mediaRelations = relations(mediaTable, ({ one, many }) => ({
  creator: one(userTable, {
    fields: [mediaTable.userId],
    references: [userTable.id],
  }),
  isLiked: one(mediaLikeTable, {
    fields: [mediaTable.id],
    references: [mediaLikeTable.mediaId],
  }),
  isBookmarked: one(mediaBookmarkTable, {
    fields: [mediaTable.id],
    references: [mediaBookmarkTable.mediaId],
  }),
}));

export const mediaLikeRelations = relations(mediaLikeTable, ({ one }) => ({
  user: one(userTable, {
    fields: [mediaLikeTable.userId],
    references: [userTable.id],
  }),
  media: one(mediaTable, {
    fields: [mediaLikeTable.mediaId],
    references: [mediaTable.id],
  }),
}));

export const bookmarkRelations = relations(mediaBookmarkTable, ({ one }) => ({
  user: one(userTable, {
    fields: [mediaBookmarkTable.userId],
    references: [userTable.id],
  }),
  media: one(mediaTable, {
    fields: [mediaBookmarkTable.mediaId],
    references: [mediaTable.id],
  }),
}));
