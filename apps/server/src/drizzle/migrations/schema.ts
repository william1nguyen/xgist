import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const video = pgTable(
  "video",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    title: text().notNull(),
    description: text().notNull(),
    thumbnailUrl: text("thumbnail_url"),
    transcripts: jsonb().default([]),
    tags: jsonb().default([]),
    userId: uuid("user_id").notNull(),
    createdTime: timestamp("created_time", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    updatedTime: timestamp("updated_time", {
      withTimezone: true,
      mode: "string",
    }),
    deletedTime: timestamp("deleted_time", {
      withTimezone: true,
      mode: "string",
    }),
    createdBy: jsonb("created_by"),
    updatedBy: jsonb("updated_by"),
    deletedBy: jsonb("deleted_by"),
  },
  (table) => [
    index("author_fk_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "video_user_id_users_id_fk",
    }),
  ]
);

export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  username: text().notNull(),
  email: text().notNull(),
  createdTime: timestamp("created_time", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedTime: timestamp("updated_time", {
    withTimezone: true,
    mode: "string",
  }),
  deletedTime: timestamp("deleted_time", {
    withTimezone: true,
    mode: "string",
  }),
  createdBy: jsonb("created_by"),
  updatedBy: jsonb("updated_by"),
  deletedBy: jsonb("deleted_by"),
  keycloakUserId: uuid("keycloak_user_id").notNull(),
});

export const comments = pgTable(
  "comments",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    content: text().notNull(),
    videoId: uuid("video_id").notNull(),
    userId: uuid("user_id").notNull(),
    createdTime: timestamp("created_time", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    updatedTime: timestamp("updated_time", {
      withTimezone: true,
      mode: "string",
    }),
    deletedTime: timestamp("deleted_time", {
      withTimezone: true,
      mode: "string",
    }),
    createdBy: jsonb("created_by"),
    updatedBy: jsonb("updated_by"),
    deletedBy: jsonb("deleted_by"),
  },
  (table) => [
    index("comment_user_fk_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    index("comment_video_fk_idx").using(
      "btree",
      table.videoId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.videoId],
      foreignColumns: [video.id],
      name: "comments_video_id_video_id_fk",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "comments_user_id_users_id_fk",
    }),
  ]
);

export const likes = pgTable(
  "likes",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    videoId: uuid("video_id").notNull(),
    userId: uuid("user_id").notNull(),
    createdTime: timestamp("created_time", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    updatedTime: timestamp("updated_time", {
      withTimezone: true,
      mode: "string",
    }),
    deletedTime: timestamp("deleted_time", {
      withTimezone: true,
      mode: "string",
    }),
    createdBy: jsonb("created_by"),
    updatedBy: jsonb("updated_by"),
    deletedBy: jsonb("deleted_by"),
  },
  (table) => [
    index("like_user_fk_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    index("like_video_fk_idx").using(
      "btree",
      table.videoId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.videoId],
      foreignColumns: [video.id],
      name: "likes_video_id_video_id_fk",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "likes_user_id_users_id_fk",
    }),
    unique("like_constraint").on(table.videoId, table.userId),
  ]
);
