import { integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { userTable } from "./user";
import { commonFields } from "./base";

export const videoTable = pgTable('video', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  transcripts: jsonb('transcripts').$type<string[]>().default([]),
  tags: jsonb('tags').$type<string[]>().default([]),
  views: integer().default(0),
  likes: integer().default(0),
  comments: integer().default(0),
  authorId: uuid('author_id').references(() => userTable.id),
  ...commonFields
});