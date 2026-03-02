import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import type {
	ProcessingOptions,
	VideoDetail,
	VideoStatusResponse,
} from "@repo/types";
import { CREDIT_COSTS, STREAM_KEYS } from "@xgist/config";
import { and, asc, eq } from "@xgist/db";
import {
	credits,
	creditTransactions,
	summaries,
	summaryRefs,
	transcriptSegments,
	videos,
} from "@xgist/db/schema/media";
import { z } from "zod";

import { protectedProcedure } from "../index";

const ALLOWED_MIME_TYPES = new Set([
	"video/mp4",
	"video/quicktime",
	"video/x-matroska",
	"video/webm",
	"audio/mpeg",
	"audio/wav",
	"audio/x-wav",
	"audio/mp4",
	"audio/m4a",
	"audio/x-m4a",
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024;

function computeCreditCost(options: ProcessingOptions): number {
	return (Object.keys(CREDIT_COSTS) as Array<keyof typeof CREDIT_COSTS>).reduce(
		(total, key) => (options[key] ? total + CREDIT_COSTS[key] : total),
		0,
	);
}

const processingOptionsSchema = z.object({
	transcribe: z.boolean().default(true),
	summarize: z.boolean().default(false),
	extractKeywords: z.boolean().default(false),
	extractMainIdeas: z.boolean().default(false),
	generateNotes: z.boolean().default(false),
	generateAudioSummary: z.boolean().default(false),
});

export const videoRouter = {
	getUploadUrl: protectedProcedure
		.input(z.object({ filename: z.string().min(1), mimeType: z.string() }))
		.handler(async ({ input, context }) => {
			const objectName = `${randomUUID()}-${input.filename}`;
			const uploadUrl = await context.minio.presignedPutObject(
				"media",
				objectName,
				60 * 15,
			);
			const publicUrl = uploadUrl.split("?")[0];
			return { uploadUrl, publicUrl, objectName };
		}),

	upload: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1),
				mediaType: z.enum(["video", "audio"]),
				mimeType: z.string(),
				fileSize: z.number(),
				mediaUrl: z.string().url(),
				options: processingOptionsSchema,
			}),
		)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			if (input.fileSize > MAX_FILE_SIZE) {
				throw new ORPCError("BAD_REQUEST", { message: "FILE_TOO_LARGE" });
			}

			if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
				throw new ORPCError("BAD_REQUEST", { message: "UNSUPPORTED_FORMAT" });
			}

			const creditCost = computeCreditCost(input.options);
			const videoId = randomUUID();
			const jobId = randomUUID();

			await context.db.transaction(async (tx) => {
				const [userCredits] = await tx
					.select()
					.from(credits)
					.where(eq(credits.userId, userId))
					.for("update");

				if (!userCredits || userCredits.balance < creditCost) {
					throw new ORPCError("FORBIDDEN", { message: "INSUFFICIENT_CREDITS" });
				}

				await tx.insert(videos).values({
					id: videoId,
					userId,
					title: input.title,
					status: "pending",
					mediaUrl: input.mediaUrl,
					mediaType: input.mediaType,
					options: input.options,
				});

				await tx
					.update(credits)
					.set({
						balance: userCredits.balance - creditCost,
						updatedAt: new Date(),
					})
					.where(eq(credits.userId, userId));

				await tx.insert(creditTransactions).values({
					userId,
					delta: -creditCost,
					reason: "job_deduction",
					metadata: { videoTitle: input.title, videoId },
				});
			});

			await context.redis.xadd(
				STREAM_KEYS.jobs,
				"*",
				"jobId",
				jobId,
				"videoId",
				videoId,
				"userId",
				userId,
				"mediaUrl",
				input.mediaUrl,
				"mediaType",
				input.mediaType,
				"options",
				JSON.stringify(input.options),
			);

			return { jobId, videoId, status: "pending" as const };
		}),

	retry: protectedProcedure
		.input(z.object({ videoId: z.string().uuid() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const [video] = await context.db
				.select()
				.from(videos)
				.where(and(eq(videos.id, input.videoId), eq(videos.userId, userId)));

			if (!video) {
				throw new ORPCError("UNAUTHORIZED");
			}

			if (video.status !== "failed") {
				throw new ORPCError("BAD_REQUEST", { message: "NOT_FAILED" });
			}

			const options = video.options as ProcessingOptions;
			const creditCost = computeCreditCost(options);
			const jobId = randomUUID();

			await context.db.transaction(async (tx) => {
				const [userCredits] = await tx
					.select()
					.from(credits)
					.where(eq(credits.userId, userId))
					.for("update");

				if (!userCredits || userCredits.balance < creditCost) {
					throw new ORPCError("FORBIDDEN", { message: "INSUFFICIENT_CREDITS" });
				}

				await tx
					.update(videos)
					.set({ status: "pending" })
					.where(eq(videos.id, input.videoId));

				await tx
					.update(credits)
					.set({
						balance: userCredits.balance - creditCost,
						updatedAt: new Date(),
					})
					.where(eq(credits.userId, userId));

				await tx.insert(creditTransactions).values({
					userId,
					delta: -creditCost,
					reason: "job_deduction",
					metadata: { videoTitle: video.title, videoId: video.id },
				});
			});

			await context.redis.xadd(
				STREAM_KEYS.jobs,
				"*",
				"jobId",
				jobId,
				"videoId",
				video.id,
				"userId",
				userId,
				"mediaUrl",
				video.mediaUrl,
				"mediaType",
				video.mediaType,
				"options",
				JSON.stringify(options),
			);

			return { jobId, videoId: video.id, status: "pending" as const };
		}),

	getStatus: protectedProcedure
		.input(z.object({ videoId: z.string().uuid() }))
		.handler(
			async ({
				input,
				context,
			}): Promise<VideoStatusResponse & { currentStep: string | null }> => {
				const userId = context.session.user.id;

				const [video] = await context.db
					.select()
					.from(videos)
					.where(and(eq(videos.id, input.videoId), eq(videos.userId, userId)));

				if (!video) {
					throw new ORPCError("UNAUTHORIZED");
				}

				return { status: video.status, progress: null, currentStep: null };
			},
		),

	getDetail: protectedProcedure
		.input(z.object({ videoId: z.string().uuid() }))
		.handler(async ({ input, context }): Promise<VideoDetail> => {
			const userId = context.session.user.id;

			const [video] = await context.db
				.select()
				.from(videos)
				.where(and(eq(videos.id, input.videoId), eq(videos.userId, userId)));

			if (!video) {
				throw new ORPCError("UNAUTHORIZED");
			}

			if (video.status !== "completed") {
				throw new ORPCError("BAD_REQUEST", { message: "NOT_READY" });
			}

			const segments = await context.db
				.select()
				.from(transcriptSegments)
				.where(eq(transcriptSegments.videoId, input.videoId))
				.orderBy(asc(transcriptSegments.index));

			const [summary] = await context.db
				.select()
				.from(summaries)
				.where(eq(summaries.videoId, input.videoId));

			const mappedVideo = {
				id: video.id,
				userId: video.userId,
				title: video.title,
				status: video.status,
				mediaUrl: video.mediaUrl,
				mediaType: video.mediaType,
				options: video.options as ProcessingOptions,
				createdAt: video.createdAt,
			};

			const mappedTranscript = segments.map((s) => ({
				id: s.id,
				videoId: s.videoId,
				index: s.index,
				start: s.start,
				end: s.end,
				text: s.text,
			}));

			if (!summary) {
				return {
					video: mappedVideo,
					transcript: mappedTranscript,
					summary: null,
				};
			}

			const refs = await context.db
				.select()
				.from(summaryRefs)
				.where(eq(summaryRefs.summaryId, summary.id));

			return {
				video: mappedVideo,
				transcript: mappedTranscript,
				summary: {
					id: summary.id,
					videoId: summary.videoId,
					summary: summary.summary,
					keywords: summary.keywords ?? [],
					mainIdeas: summary.mainIdeas ?? [],
					notes: summary.notes,
					audioSummaryUrl: summary.audioSummaryUrl,
					refs: refs.map((r) => ({
						id: r.id,
						summaryId: r.summaryId,
						sentenceIndex: r.sentenceIndex,
						transcriptIndices: r.transcriptIndices ?? [],
					})),
				},
			};
		}),
};
