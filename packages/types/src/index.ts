export type VideoStatus = "pending" | "processing" | "completed" | "failed";
export type MediaType = "video" | "audio";

export type ProcessingOptions = {
	transcribe: boolean;
	summarize: boolean;
	extractKeywords: boolean;
	extractMainIdeas: boolean;
	generateNotes: boolean;
	generateAudioSummary: boolean;
};

export type Video = {
	id: string;
	userId: string;
	title: string;
	status: VideoStatus;
	mediaUrl: string;
	mediaType: MediaType;
	options: ProcessingOptions;
	createdAt: Date;
};

export type TranscriptSegment = {
	id: string;
	videoId: string;
	index: number;
	start: number;
	end: number;
	text: string;
};

export type SummaryRef = {
	id: string;
	summaryId: string;
	sentenceIndex: number;
	transcriptIndices: number[];
};

export type Summary = {
	id: string;
	videoId: string;
	summary: string;
	keywords: string[];
	mainIdeas: string[];
	notes: string | null;
	audioSummaryUrl: string | null;
	refs: SummaryRef[];
};

export type Credit = {
	userId: string;
	balance: number;
	updatedAt: Date;
};

export type CreditTransaction = {
	id: string;
	userId: string;
	delta: number;
	reason: string;
	metadata: Record<string, string | number> | null;
	createdAt: Date;
};

export type JobPayload = {
	jobId: string;
	videoId: string;
	userId: string;
	mediaUrl: string;
	mediaType: MediaType;
	options: ProcessingOptions;
};

export type ResultPayload = {
	jobId: string;
	videoId: string;
	status: "completed" | "failed";
	error: string | null;
	transcript: Array<Pick<TranscriptSegment, "start" | "end" | "text">>;
	summary: string | null;
	summaryRefs: Array<Pick<SummaryRef, "sentenceIndex" | "transcriptIndices">>;
	keywords: string[];
	mainIdeas: string[];
	notes: string | null;
	audioSummaryUrl: string | null;
};

export type VideoDetail = {
	video: Video;
	transcript: TranscriptSegment[];
	summary: Summary | null;
};

export type VideoStatusResponse = {
	status: VideoStatus;
	progress: number | null;
};

export type QueueJob = {
	jobId: string;
	video: Pick<Video, "id" | "title" | "status" | "options" | "createdAt">;
	creditCost: number;
};
