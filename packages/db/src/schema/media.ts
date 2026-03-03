import { relations } from "drizzle-orm";
import {
	integer,
	jsonb,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { userTable } from "./auth";

export const videoStatusEnum = pgEnum("video_status", [
	"pending",
	"processing",
	"completed",
	"failed",
]);

export const mediaTypeEnum = pgEnum("media_type", ["video", "audio"]);

export const videosTable = pgTable("videos", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => userTable.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	status: videoStatusEnum("status").notNull().default("pending"),
	mediaUrl: text("media_url").notNull(),
	mediaType: mediaTypeEnum("media_type").notNull(),
	options: jsonb("options").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transcriptSegmentsTable = pgTable("transcript_segments", {
	id: uuid("id").primaryKey().defaultRandom(),
	videoId: uuid("video_id")
		.notNull()
		.references(() => videosTable.id, { onDelete: "cascade" }),
	index: integer("index").notNull(),
	start: real("start").notNull(),
	end: real("end").notNull(),
	text: text("text").notNull(),
});

export const summariesTable = pgTable("summaries", {
	id: uuid("id").primaryKey().defaultRandom(),
	videoId: uuid("video_id")
		.notNull()
		.unique()
		.references(() => videosTable.id, { onDelete: "cascade" }),
	summary: text("summary").notNull(),
	keywords: text("keywords").array().notNull().default([]),
	mainIdeas: text("main_ideas").array().notNull().default([]),
	notes: text("notes"),
	audioSummaryUrl: text("audio_summary_url"),
});

export const summaryRefsTable = pgTable("summary_refs", {
	id: uuid("id").primaryKey().defaultRandom(),
	summaryId: uuid("summary_id")
		.notNull()
		.references(() => summariesTable.id, { onDelete: "cascade" }),
	sentenceIndex: integer("sentence_index").notNull(),
	transcriptIndices: integer("transcript_indices")
		.array()
		.notNull()
		.default([]),
});

export const creditsTable = pgTable("credits", {
	userId: uuid("user_id")
		.primaryKey()
		.references(() => userTable.id, { onDelete: "cascade" }),
	balance: integer("balance").notNull().default(0),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const creditTransactionsTable = pgTable("credit_transactions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => userTable.id, { onDelete: "cascade" }),
	delta: integer("delta").notNull(),
	reason: text("reason").notNull(),
	metadata: jsonb("metadata"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videosRelations = relations(videosTable, ({ many, one }) => ({
	transcriptSegments: many(transcriptSegmentsTable),
	summary: one(summariesTable, {
		fields: [videosTable.id],
		references: [summariesTable.videoId],
	}),
}));

export const transcriptSegmentsRelations = relations(
	transcriptSegmentsTable,
	({ one }) => ({
		video: one(videosTable, {
			fields: [transcriptSegmentsTable.videoId],
			references: [videosTable.id],
		}),
	}),
);

export const summariesRelations = relations(
	summariesTable,
	({ one, many }) => ({
		video: one(videosTable, {
			fields: [summariesTable.videoId],
			references: [videosTable.id],
		}),
		refs: many(summaryRefsTable),
	}),
);

export const summaryRefsRelations = relations(summaryRefsTable, ({ one }) => ({
	summary: one(summariesTable, {
		fields: [summaryRefsTable.summaryId],
		references: [summariesTable.id],
	}),
}));

export type DbVideo = typeof videosTable.$inferSelect;
export type NewDbVideo = typeof videosTable.$inferInsert;
export type DbTranscriptSegment = typeof transcriptSegmentsTable.$inferSelect;
export type DbSummary = typeof summariesTable.$inferSelect;
export type DbSummaryRef = typeof summaryRefsTable.$inferSelect;
export type DbCredit = typeof creditsTable.$inferSelect;
export type DbCreditTransaction = typeof creditTransactionsTable.$inferSelect;
