import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { userTable } from "./user";
import { relations } from "drizzle-orm";
import { commonFields } from "./base";
import { agentTable } from "./agent";

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
    ...commonFields,
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
      .references(() => mediaTable.id, { onDelete: "cascade" })
      .notNull(),
    views: integer("view").default(0).notNull(),
    mediaType: text("media_type").notNull(),
    isSummarized: boolean("is_summarized").default(false).notNull(),
    ...commonFields,
  },
  (table) => {
    return {
      mediaIdx: index("media_idx").on(table.mediaId),
    };
  }
);

export const transcriptTable = pgTable("transcript", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  mediaId: uuid("media_id")
    .references(() => mediaTable.id, { onDelete: "cascade" })
    .notNull(),
  content: text("text").notNull(),
  ...commonFields,
});

export const chunkTable = pgTable("chunk", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  transcriptId: uuid("transcript_id")
    .references(() => transcriptTable.id, { onDelete: "cascade" })
    .notNull(),
  time: doublePrecision("time").notNull(),
  content: text("text").notNull(),
  ...commonFields,
});

export const summaryTable = pgTable("summary", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  mediaId: uuid("media_id")
    .references(() => mediaTable.id, { onDelete: "cascade" })
    .notNull(),
  transcriptId: uuid("transcript_id")
    .references(() => transcriptTable.id, { onDelete: "cascade" })
    .notNull(),
  content: text("text").notNull(),
  ...commonFields,
});

export const keywordTable = pgTable("keyword", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  mediaId: uuid("media_id")
    .references(() => mediaTable.id, { onDelete: "cascade" })
    .notNull(),
  transcriptId: uuid("transcript_id")
    .references(() => transcriptTable.id, { onDelete: "cascade" })
    .notNull(),
  content: text("text").notNull(),
  ...commonFields,
});

export const keypointTable = pgTable("keypoint", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  mediaId: uuid("media_id")
    .references(() => mediaTable.id, { onDelete: "cascade" })
    .notNull(),
  transcriptId: uuid("transcript_id")
    .references(() => transcriptTable.id, { onDelete: "cascade" })
    .notNull(),
  content: text("text").notNull(),
  ...commonFields,
});

export const aiPresenterTable = pgTable("ai_presenter", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: uuid("user_id")
    .references(() => userTable.id, { onDelete: "cascade" })
    .notNull(),
  mediaId: uuid("media_id")
    .references(() => mediaTable.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agentTable.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  ...commonFields,
});

export const mediaLikeTable = pgTable(
  "media_like",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: uuid("user_id")
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => mediaTable.id, { onDelete: "cascade" })
      .notNull(),
    state: boolean("state"),
    ...commonFields,
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
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    mediaId: uuid("media_id")
      .references(() => mediaTable.id, { onDelete: "cascade" })
      .notNull(),
    state: boolean("state"),
    ...commonFields,
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

export const transcriptRelations = relations(transcriptTable, ({ one }) => ({
  media: one(mediaTable, {
    fields: [transcriptTable.mediaId],
    references: [mediaTable.id],
  }),
}));

export const chunkRelations = relations(chunkTable, ({ one }) => ({
  transcript: one(transcriptTable, {
    fields: [chunkTable.transcriptId],
    references: [transcriptTable.id],
  }),
}));

export const summaryRelations = relations(summaryTable, ({ one }) => ({
  media: one(mediaTable, {
    fields: [summaryTable.mediaId],
    references: [mediaTable.id],
  }),

  transcript: one(transcriptTable, {
    fields: [summaryTable.transcriptId],
    references: [transcriptTable.id],
  }),
}));

export const keywordRelations = relations(keywordTable, ({ one }) => ({
  media: one(mediaTable, {
    fields: [keywordTable.mediaId],
    references: [mediaTable.id],
  }),

  transcript: one(transcriptTable, {
    fields: [keywordTable.transcriptId],
    references: [transcriptTable.id],
  }),
}));

export const keypointRelations = relations(keypointTable, ({ one }) => ({
  media: one(mediaTable, {
    fields: [keypointTable.mediaId],
    references: [mediaTable.id],
  }),

  transcript: one(transcriptTable, {
    fields: [keypointTable.transcriptId],
    references: [transcriptTable.id],
  }),
}));

export const aiPresenterRelations = relations(aiPresenterTable, ({ one }) => ({
  media: one(mediaTable, {
    fields: [aiPresenterTable.mediaId],
    references: [mediaTable.id],
  }),
  user: one(userTable, {
    fields: [aiPresenterTable.userId],
    references: [userTable.id],
  }),
  agent: one(agentTable, {
    fields: [aiPresenterTable.agentId],
    references: [agentTable.id],
  }),
}));
