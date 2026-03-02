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

import { user } from "./auth";

export const videoStatusEnum = pgEnum("video_status", [
	"pending",
	"processing",
	"completed",
	"failed",
]);

export const mediaTypeEnum = pgEnum("media_type", ["video", "audio"]);

export const videos = pgTable("videos", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	status: videoStatusEnum("status").notNull().default("pending"),
	mediaUrl: text("media_url").notNull(),
	mediaType: mediaTypeEnum("media_type").notNull(),
	options: jsonb("options").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transcriptSegments = pgTable("transcript_segments", {
	id: uuid("id").primaryKey().defaultRandom(),
	videoId: uuid("video_id")
		.notNull()
		.references(() => videos.id, { onDelete: "cascade" }),
	index: integer("index").notNull(),
	start: real("start").notNull(),
	end: real("end").notNull(),
	text: text("text").notNull(),
});

export const summaries = pgTable("summaries", {
	id: uuid("id").primaryKey().defaultRandom(),
	videoId: uuid("video_id")
		.notNull()
		.unique()
		.references(() => videos.id, { onDelete: "cascade" }),
	summary: text("summary").notNull(),
	keywords: text("keywords").array().notNull().default([]),
	mainIdeas: text("main_ideas").array().notNull().default([]),
	notes: text("notes"),
	audioSummaryUrl: text("audio_summary_url"),
});

export const summaryRefs = pgTable("summary_refs", {
	id: uuid("id").primaryKey().defaultRandom(),
	summaryId: uuid("summary_id")
		.notNull()
		.references(() => summaries.id, { onDelete: "cascade" }),
	sentenceIndex: integer("sentence_index").notNull(),
	transcriptIndices: integer("transcript_indices")
		.array()
		.notNull()
		.default([]),
});

export const credits = pgTable("credits", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	balance: integer("balance").notNull().default(0),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const creditTransactions = pgTable("credit_transactions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	delta: integer("delta").notNull(),
	reason: text("reason").notNull(),
	metadata: jsonb("metadata"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videosRelations = relations(videos, ({ many, one }) => ({
	transcriptSegments: many(transcriptSegments),
	summary: one(summaries, {
		fields: [videos.id],
		references: [summaries.videoId],
	}),
}));

export const transcriptSegmentsRelations = relations(
	transcriptSegments,
	({ one }) => ({
		video: one(videos, {
			fields: [transcriptSegments.videoId],
			references: [videos.id],
		}),
	}),
);

export const summariesRelations = relations(summaries, ({ one, many }) => ({
	video: one(videos, {
		fields: [summaries.videoId],
		references: [videos.id],
	}),
	refs: many(summaryRefs),
}));

export const summaryRefsRelations = relations(summaryRefs, ({ one }) => ({
	summary: one(summaries, {
		fields: [summaryRefs.summaryId],
		references: [summaries.id],
	}),
}));

export type DbVideo = typeof videos.$inferSelect;
export type NewDbVideo = typeof videos.$inferInsert;
export type DbTranscriptSegment = typeof transcriptSegments.$inferSelect;
export type DbSummary = typeof summaries.$inferSelect;
export type DbSummaryRef = typeof summaryRefs.$inferSelect;
export type DbCredit = typeof credits.$inferSelect;
export type DbCreditTransaction = typeof creditTransactions.$inferSelect;
