// ADR 0004: accepted containers/MIME types and the launch size ceiling.
export const ACCEPTED_MIME_TYPES = [
	"video/mp4",
	"video/quicktime",
	"video/x-matroska",
	"video/webm",
	"audio/mpeg",
	"audio/wav",
	"audio/x-wav",
	"audio/mp4",
] as const;

export const ACCEPTED_EXTENSIONS = [
	".mp4",
	".mov",
	".mkv",
	".webm",
	".mp3",
	".wav",
	".m4a",
] as const;

export const MAX_UPLOAD_BYTES = 524_288_000; // 500 MiB

export type ProcessingOptionId =
	| "transcribe"
	| "summarize"
	| "extract_keywords"
	| "extract_keypoints"
	| "generate_notes"
	| "generate_audio_summary";

type ProcessingOption = {
	id: ProcessingOptionId;
	label: string;
	description: string;
	credits: number;
	required?: boolean;
	dependsOn?: ProcessingOptionId;
};

// billing.md's seeded "launch-v1" catalog (services/billing/migrations/V1__init.sql).
// The live price for a selection always comes from the `quote` query — these
// are shown only as an at-a-glance reference before a quote is fetched.
export const PROCESSING_OPTIONS: readonly ProcessingOption[] = [
	{
		id: "transcribe",
		label: "Transcript",
		description:
			"Timestamped transcript segments (required for everything else)",
		credits: 10,
		required: true,
	},
	{
		id: "summarize",
		label: "Summary",
		description: "Cited summary with evidence links back to the transcript",
		credits: 20,
	},
	{
		id: "extract_keywords",
		label: "Keywords",
		description: "Ranked keywords",
		credits: 5,
	},
	{
		id: "extract_keypoints",
		label: "Keypoints",
		description: "Key points tied to transcript ranges",
		credits: 10,
	},
	{
		id: "generate_notes",
		label: "Notes",
		description: "Structured notes",
		credits: 15,
	},
	{
		id: "generate_audio_summary",
		label: "Audio summary",
		description: "Text-to-speech summary audio",
		credits: 30,
		dependsOn: "summarize",
	},
];

export const TERMINAL_MEDIA_STATUSES = new Set(["COMPLETED", "FAILED"]);

// edge-tts neural voices (services/worker/src/providers/tts.py) — a
// curated subset, not the full provider catalog. "en-US-AriaNeural"
// matches WORKER_TTS_VOICE's default, so it's what an unselected voice
// falls back to server-side. Verified against edge_tts.list_voices() —
// "en-US-DavisNeural" has been retired upstream and was swapped for
// "en-US-AndrewNeural".
export const TTS_VOICES = [
	{ id: "en-US-AriaNeural", label: "Aria", description: "US English · female" },
	{ id: "en-US-GuyNeural", label: "Guy", description: "US English · male" },
	{
		id: "en-US-JennyNeural",
		label: "Jenny",
		description: "US English · female",
	},
	{
		id: "en-US-AndrewNeural",
		label: "Andrew",
		description: "US English · male",
	},
	{
		id: "en-GB-SoniaNeural",
		label: "Sonia",
		description: "British English · female",
	},
	{
		id: "en-GB-RyanNeural",
		label: "Ryan",
		description: "British English · male",
	},
] as const;

export const DEFAULT_TTS_VOICE = "en-US-AriaNeural";
