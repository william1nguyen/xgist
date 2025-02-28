import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { commonFields } from "./base";
import { userTable } from "./user";
import { relations } from "drizzle-orm";

export const videoCategory = pgEnum("category", [
  "technology",
  "education",
  "productivity",
  "finance",
  "travel",
  "health",
]);

export type VideoMetadata = {
  transcripts: string[];
  summary: string;
};

export const videoTable = pgTable(
  "video",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    thumbnail: text("thumbnail").notNull(),
    userId: uuid("user_id")
      .references(() => userTable.id)
      .notNull(),
    category: videoCategory("category").default("technology").notNull(),
    duration: integer("duration").default(0).notNull(),
    views: integer("views").default(0).notNull(),
    likes: integer("likes").default(0).notNull(),
    isSummarized: boolean("is_summarized").default(false).notNull(),
    metadata: jsonb().$type<VideoMetadata>(),
    ...commonFields,
  },
  (table) => {
    return {
      creatorIdx: index("creator_fk_idx").on(table.userId),
    };
  }
);

export const likeTable = pgTable(
  "like",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: uuid("user_id")
      .references(() => userTable.id)
      .notNull(),
    videoId: uuid("video_id")
      .references(() => videoTable.id)
      .notNull(),
  },
  (table) => {
    return {
      likeActorIdx: index("like_actor_idx").on(table.userId),
      likeVideoIdx: index("like_video_idx").on(table.videoId),
    };
  }
);

export const bookmarkTable = pgTable(
  "bookmark",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: uuid("user_id")
      .references(() => userTable.id)
      .notNull(),
    videoId: uuid("video_id")
      .references(() => videoTable.id)
      .notNull(),
    state: boolean("state"),
  },
  (table) => {
    return {
      bookmarkActorIdx: index("bookmark_actor_idx").on(table.userId),
      bookmarkVideoIdx: index("bookmark_video_idx").on(table.videoId),
    };
  }
);

export const videoRelations = relations(videoTable, ({ one }) => ({
  creator: one(userTable, {
    fields: [videoTable.userId],
    references: [userTable.id],
  }),
}));
