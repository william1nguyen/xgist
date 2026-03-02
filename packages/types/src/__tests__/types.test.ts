import type {
	Credit,
	CreditTransaction,
	JobPayload,
	MediaType,
	ProcessingOptions,
	QueueJob,
	ResultPayload,
	Summary,
	SummaryRef,
	TranscriptSegment,
	Video,
	VideoDetail,
	VideoStatus,
	VideoStatusResponse,
} from "@repo/types";
import { describe, expectTypeOf, it } from "vitest";

describe("@repo/types — type exports", () => {
	it("VideoStatus is a string union", () => {
		expectTypeOf<VideoStatus>().toEqualTypeOf<
			"pending" | "processing" | "completed" | "failed"
		>();
	});

	it("MediaType is a string union", () => {
		expectTypeOf<MediaType>().toEqualTypeOf<"video" | "audio">();
	});

	it("ProcessingOptions has all boolean fields", () => {
		expectTypeOf<ProcessingOptions>().toHaveProperty("transcribe");
		expectTypeOf<ProcessingOptions>().toHaveProperty("summarize");
		expectTypeOf<ProcessingOptions>().toHaveProperty("extractKeywords");
		expectTypeOf<ProcessingOptions>().toHaveProperty("extractMainIdeas");
		expectTypeOf<ProcessingOptions>().toHaveProperty("generateNotes");
		expectTypeOf<ProcessingOptions>().toHaveProperty("generateAudioSummary");
	});

	it("Video has required fields", () => {
		expectTypeOf<Video>().toHaveProperty("id");
		expectTypeOf<Video>().toHaveProperty("userId");
		expectTypeOf<Video>().toHaveProperty("status");
		expectTypeOf<Video>().toHaveProperty("mediaType");
		expectTypeOf<Video>().toHaveProperty("options");
		expectTypeOf<Video>().toHaveProperty("createdAt");
	});

	it("TranscriptSegment has time range fields", () => {
		expectTypeOf<TranscriptSegment>().toHaveProperty("start");
		expectTypeOf<TranscriptSegment>().toHaveProperty("end");
		expectTypeOf<TranscriptSegment>().toHaveProperty("text");
		expectTypeOf<TranscriptSegment>().toHaveProperty("index");
	});

	it("SummaryRef has sentenceIndex and transcriptIndices", () => {
		expectTypeOf<SummaryRef>().toHaveProperty("sentenceIndex");
		expectTypeOf<SummaryRef>().toHaveProperty("transcriptIndices");
	});

	it("Summary has all AI output fields", () => {
		expectTypeOf<Summary>().toHaveProperty("summary");
		expectTypeOf<Summary>().toHaveProperty("keywords");
		expectTypeOf<Summary>().toHaveProperty("mainIdeas");
		expectTypeOf<Summary>().toHaveProperty("notes");
		expectTypeOf<Summary>().toHaveProperty("audioSummaryUrl");
		expectTypeOf<Summary>().toHaveProperty("refs");
	});

	it("Credit has balance field", () => {
		expectTypeOf<Credit>().toHaveProperty("balance");
		expectTypeOf<Credit>().toHaveProperty("userId");
	});

	it("CreditTransaction has delta and reason", () => {
		expectTypeOf<CreditTransaction>().toHaveProperty("delta");
		expectTypeOf<CreditTransaction>().toHaveProperty("reason");
		expectTypeOf<CreditTransaction>().toHaveProperty("metadata");
	});

	it("JobPayload has stream fields", () => {
		expectTypeOf<JobPayload>().toHaveProperty("jobId");
		expectTypeOf<JobPayload>().toHaveProperty("videoId");
		expectTypeOf<JobPayload>().toHaveProperty("mediaUrl");
		expectTypeOf<JobPayload>().toHaveProperty("options");
	});

	it("ResultPayload has status and result fields", () => {
		expectTypeOf<ResultPayload>().toHaveProperty("status");
		expectTypeOf<ResultPayload>().toHaveProperty("transcript");
		expectTypeOf<ResultPayload>().toHaveProperty("keywords");
		expectTypeOf<ResultPayload>().toHaveProperty("mainIdeas");
	});

	it("VideoDetail composes video, transcript, and summary", () => {
		expectTypeOf<VideoDetail>().toHaveProperty("video");
		expectTypeOf<VideoDetail>().toHaveProperty("transcript");
		expectTypeOf<VideoDetail>().toHaveProperty("summary");
	});

	it("VideoStatusResponse has status and progress", () => {
		expectTypeOf<VideoStatusResponse>().toHaveProperty("status");
		expectTypeOf<VideoStatusResponse>().toHaveProperty("progress");
	});

	it("QueueJob has jobId, video, and creditCost", () => {
		expectTypeOf<QueueJob>().toHaveProperty("jobId");
		expectTypeOf<QueueJob>().toHaveProperty("video");
		expectTypeOf<QueueJob>().toHaveProperty("creditCost");
	});
});
