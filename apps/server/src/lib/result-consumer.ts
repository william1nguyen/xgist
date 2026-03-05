import type { ResultPayload } from "@repo/types";
import { patchJobInCache } from "@xgist/api/lib/queue-cache";
import { CONSUMER_GROUPS, STREAM_KEYS } from "@xgist/config";
import { db, eq } from "@xgist/db";
import {
	summariesTable,
	summaryRefsTable,
	transcriptSegmentsTable,
	videosTable,
} from "@xgist/db/schema/media";
import type { Redis } from "ioredis";

type TranscriptItem = ResultPayload["transcript"][number];
type SummaryRefItem = ResultPayload["summaryRefs"][number];

const CONSUMER_NAME = "consumer-1";
const BLOCK_MS = 5000;
const COUNT = 10;

type StreamEntry = [id: string, fields: string[]];

function parseFields(fields: string[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (let i = 0; i < fields.length; i += 2) {
		const key = fields[i];
		const value = fields[i + 1];
		if (key !== undefined && value !== undefined) {
			result[key] = value;
		}
	}
	return result;
}

async function resolveUserId(videoId: string): Promise<string | null> {
	const [video] = await db
		.select({ userId: videosTable.userId })
		.from(videosTable)
		.where(eq(videosTable.id, videoId));
	return video?.userId ?? null;
}

async function processResult(redis: Redis, payload: ResultPayload) {
	if (payload.status === "failed") {
		await db
			.update(videosTable)
			.set({ status: "failed" })
			.where(eq(videosTable.id, payload.videoId));
		const userId = await resolveUserId(payload.videoId);
		if (userId)
			await patchJobInCache(redis, userId, payload.videoId, {
				status: "failed",
			});
		return;
	}

	let userId: string | null = null;

	await db.transaction(async (tx) => {
		if (payload.transcript.length > 0) {
			await tx.insert(transcriptSegmentsTable).values(
				payload.transcript.map((seg: TranscriptItem, index: number) => ({
					videoId: payload.videoId,
					index,
					start: seg.start,
					end: seg.end,
					text: seg.text,
				})),
			);
		}

		if (payload.summary) {
			const [inserted] = await tx
				.insert(summariesTable)
				.values({
					videoId: payload.videoId,
					summary: payload.summary,
					keywords: payload.keywords,
					mainIdeas: payload.mainIdeas,
					notes: payload.notes,
					audioSummaryUrl: payload.audioSummaryUrl,
				})
				.onConflictDoUpdate({
					target: summariesTable.videoId,
					set: {
						summary: payload.summary,
						keywords: payload.keywords,
						mainIdeas: payload.mainIdeas,
						notes: payload.notes,
						audioSummaryUrl: payload.audioSummaryUrl,
					},
				})
				.returning();

			if (inserted && payload.summaryRefs.length > 0) {
				await tx.insert(summaryRefsTable).values(
					payload.summaryRefs.map((ref: SummaryRefItem) => ({
						summaryId: inserted.id,
						sentenceIndex: ref.sentenceIndex,
						transcriptIndices: ref.transcriptIndices,
					})),
				);
			}
		} else if (payload.audioSummaryUrl) {
			await tx
				.update(summariesTable)
				.set({ audioSummaryUrl: payload.audioSummaryUrl })
				.where(eq(summariesTable.videoId, payload.videoId));
		}

		const [updated] = await tx
			.update(videosTable)
			.set({ status: "completed" })
			.where(eq(videosTable.id, payload.videoId))
			.returning({ userId: videosTable.userId });

		userId = updated?.userId ?? null;
	});

	if (userId)
		await patchJobInCache(redis, userId, payload.videoId, {
			status: "completed",
		});
}

async function ensureConsumerGroup(redis: Redis) {
	try {
		await redis.xgroup(
			"CREATE",
			STREAM_KEYS.results,
			CONSUMER_GROUPS.server,
			"0",
			"MKSTREAM",
		);
	} catch (err) {
		const error = err as { message?: string };
		if (!error.message?.includes("BUSYGROUP")) throw err;
	}
}

async function processEntries(redis: Redis, entries: StreamEntry[]) {
	for (const [id, fields] of entries) {
		try {
			const parsed = parseFields(fields);
			const videoId = parsed.videoId;
			const jobId = parsed.jobId;

			if (!videoId || !jobId) {
				await redis.xack(STREAM_KEYS.results, CONSUMER_GROUPS.server, id);
				continue;
			}

			type RawSummaryRef = {
				sentence_index: number;
				transcript_indices: number[];
			};
			type RawTranscriptSegment = { start: number; end: number; text: string };

			const rawRefs: RawSummaryRef[] = parsed.summaryRefs
				? JSON.parse(parsed.summaryRefs)
				: [];

			const payload: ResultPayload = {
				jobId,
				videoId,
				status: (parsed.status as "completed" | "failed") ?? "failed",
				error: parsed.error !== "" ? (parsed.error ?? null) : null,
				transcript: parsed.transcript
					? (JSON.parse(parsed.transcript) as RawTranscriptSegment[]).map(
							(s) => ({
								start: s.start,
								end: s.end,
								text: s.text,
							}),
						)
					: [],
				summary: parsed.summary !== "" ? (parsed.summary ?? null) : null,
				summaryRefs: rawRefs.map((r) => ({
					sentenceIndex: r.sentence_index,
					transcriptIndices: r.transcript_indices,
				})),
				keywords: parsed.keywords ? JSON.parse(parsed.keywords) : [],
				mainIdeas: parsed.mainIdeas ? JSON.parse(parsed.mainIdeas) : [],
				notes: parsed.notes !== "" ? (parsed.notes ?? null) : null,
				audioSummaryUrl:
					parsed.audioSummaryUrl !== ""
						? (parsed.audioSummaryUrl ?? null)
						: null,
			};

			await processResult(redis, payload);
			await redis.xack(STREAM_KEYS.results, CONSUMER_GROUPS.server, id);
		} catch (msgErr) {
			console.error("[result-consumer] message failed", id, msgErr);
		}
	}
}

async function drainPending(redis: Redis) {
	while (true) {
		const results = await redis.xreadgroup(
			"GROUP",
			CONSUMER_GROUPS.server,
			CONSUMER_NAME,
			"COUNT",
			COUNT,
			"STREAMS",
			STREAM_KEYS.results,
			"0",
		);

		if (!results) break;

		let total = 0;
		for (const [, entries] of results as [string, StreamEntry[]][]) {
			total += entries.length;
			await processEntries(redis, entries);
		}

		if (total === 0) break;
	}
}

export function startResultConsumer(redis: Redis) {
	void (async () => {
		await ensureConsumerGroup(redis);
		await drainPending(redis);

		while (true) {
			try {
				const results = await redis.xreadgroup(
					"GROUP",
					CONSUMER_GROUPS.server,
					CONSUMER_NAME,
					"COUNT",
					COUNT,
					"BLOCK",
					BLOCK_MS,
					"STREAMS",
					STREAM_KEYS.results,
					">",
				);

				if (!results) continue;

				for (const [, entries] of results as [string, StreamEntry[]][]) {
					await processEntries(redis, entries);
				}
			} catch (loopErr) {
				console.error("[result-consumer] loop error, retrying in 1s", loopErr);
				await new Promise((r) => setTimeout(r, 1000));
			}
		}
	})();
}
