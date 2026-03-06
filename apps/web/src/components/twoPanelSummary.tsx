import {
	Clock,
	File,
	Pause,
	Play,
	Share,
	Volume2,
	VolumeX,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import type { TabItem } from "../types";
import { TabNavigation } from "./navigation/TabNavigation";
import { Button } from "./ui/Button";

export interface Chunk {
	time: number;
	text: string;
}

export interface Transcript {
	text: string;
	chunks: Chunk[];
}

interface TwoPanelSummaryProps {
	videoFile: File | null;
	videoPreviewUrl: string | null;
	thumbnailPreview: string | null;
	summaryData: {
		id: string;
		summary: string;
		keyPoints: string[];
		keywords?: string[];
		transcripts: Transcript;
		originalDuration: string;
		readingTime: string;
	};
	onReset: () => void;
}

export const TwoPanelSummary: React.FC<TwoPanelSummaryProps> = ({
	videoFile,
	videoPreviewUrl,
	thumbnailPreview,
	summaryData,
	onReset,
}) => {
	const { t } = useTranslation(["common", "summary", "videos"]);

	const [activeTab, setActiveTab] = useState<string>("summary");
	const [isPlaying, setIsPlaying] = useState<boolean>(false);
	const [isMuted, setIsMuted] = useState<boolean>(false);
	const [currentTime, setCurrentTime] = useState<number>(0);
	const [duration, setDuration] = useState<number>(0);

	const videoRef = useRef<HTMLVideoElement>(null);
	const transcriptContainerRef = useRef<HTMLDivElement>(null);

	const tabs: TabItem[] = [
		{ id: "summary", label: t("summary:preview.summary") },
		{ id: "key-points", label: t("summary:preview.key_points") },
	];

	if (summaryData?.keywords && summaryData.keywords.length > 0) {
		tabs.push({ id: "keywords", label: t("summary:preview.keywords") });
	}

	tabs.push({ id: "transcript", label: t("summary:preview.transcript") });

	const togglePlayPause = (): void => {
		if (videoRef.current) {
			if (isPlaying) {
				videoRef.current.pause();
			} else {
				videoRef.current.play();
			}
			setIsPlaying(!isPlaying);
		}
	};

	const toggleMute = (): void => {
		if (videoRef.current) {
			videoRef.current.muted = !isMuted;
			setIsMuted(!isMuted);
		}
	};

	const handleTimeUpdate = (): void => {
		if (videoRef.current) {
			setCurrentTime(videoRef.current.currentTime);
			highlightCurrentTranscript(videoRef.current.currentTime);
		}
	};

	const jumpToTime = (time: number): void => {
		if (videoRef.current) {
			videoRef.current.currentTime = time;
			if (!isPlaying) {
				videoRef.current.play();
				setIsPlaying(true);
			}
		}
	};

	const highlightCurrentTranscript = (currentTime: number): void => {
		if (activeTab === "transcript" && transcriptContainerRef.current) {
			const transcriptItems =
				transcriptContainerRef.current.querySelectorAll(".transcript-item");
			let activeIndex = -1;

			for (let i = 0; i < summaryData.transcripts.chunks.length; i++) {
				const chunk = summaryData.transcripts.chunks[i];
				const nextChunk = summaryData.transcripts.chunks[i + 1];
				const chunkTime = chunk.time;
				const nextChunkTime = nextChunk
					? nextChunk.time
					: Number.POSITIVE_INFINITY;

				if (currentTime >= chunkTime && currentTime < nextChunkTime) {
					activeIndex = i;
					break;
				}
			}

			transcriptItems.forEach((item, index) => {
				if (index === activeIndex) {
					item.classList.add("bg-blue-50", "border-l-4", "border-blue-500");

					const container = transcriptContainerRef.current;
					if (container) {
						const itemTop = (item as HTMLElement).offsetTop;
						const containerScrollTop = container.scrollTop;
						const containerHeight = container.clientHeight;

						if (
							itemTop < containerScrollTop ||
							itemTop > containerScrollTop + containerHeight
						) {
							container.scrollTop = itemTop - containerHeight / 2;
						}
					}
				} else {
					item.classList.remove("bg-blue-50", "border-l-4", "border-blue-500");
				}
			});
		}
	};

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	const handleLoadedMetadata = (): void => {
		if (videoRef.current) {
			setDuration(videoRef.current.duration);
		}
	};

	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
			<div className="border-gray-200 border-b bg-gray-50 p-6">
				<div className="flex items-start justify-between">
					<div>
						<h2 className="font-bold text-2xl text-black">
							{t("summary:results.title")}
						</h2>
						<p className="mt-1 text-gray-700 text-sm">
							{videoFile?.name || t("summary:results.your_video")}
						</p>
					</div>
					<div>
						<Button
							variant="secondary"
							size="sm"
							onClick={onReset}
							type="button"
						>
							{t("summary:buttons.create_new")}
						</Button>
					</div>
				</div>
			</div>

			<div className="flex flex-col md:flex-row">
				{/* Left panel - Video */}
				<div className="w-full p-4 md:w-1/2">
					<div className="relative overflow-hidden rounded-lg border border-gray-300 shadow-sm">
						<video
							ref={videoRef}
							className="h-auto max-h-96 w-full bg-black object-contain"
							src={videoPreviewUrl || undefined}
							poster={thumbnailPreview || undefined}
							onPlay={() => setIsPlaying(true)}
							onPause={() => setIsPlaying(false)}
							onTimeUpdate={handleTimeUpdate}
							onLoadedMetadata={handleLoadedMetadata}
							muted={isMuted}
							controls={false}
						/>

						<div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent p-4">
							{/* Video progress bar */}
							<div
								className="mb-2 h-2 w-full cursor-pointer rounded-full bg-gray-700"
								onClick={(e) => {
									const rect = e.currentTarget.getBoundingClientRect();
									const clickPos = e.clientX - rect.left;
									const percent = clickPos / rect.width;
									if (videoRef.current) {
										videoRef.current.currentTime = percent * duration;
									}
								}}
							>
								<div
									className="h-full rounded-full bg-blue-500"
									style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
								/>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-4">
									<button
										onClick={togglePlayPause}
										className="rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 hover:text-blue-300"
										type="button"
									>
										{isPlaying ? <Pause size={22} /> : <Play size={22} />}
									</button>

									<button
										onClick={toggleMute}
										className="rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 hover:text-blue-300"
										type="button"
									>
										{isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
									</button>

									<span className="text-sm text-white">
										{formatTime(currentTime)} / {formatTime(duration)}
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className="mt-4">
						<div className="flex items-center space-x-2">
							<Clock size={18} className="text-gray-600" />
							<span className="font-medium text-gray-700 text-sm">
								{t("summary:results.original")}:{" "}
								{summaryData.originalDuration || "N/A"} |{" "}
								{t("summary:results.summary")}:{" "}
								{summaryData.readingTime || "N/A"}
							</span>
						</div>
					</div>
				</div>

				{/* Right panel - Summary content */}
				<div className="w-full border-gray-200 border-l p-4 md:w-1/2">
					<div className="mb-4 flex border-gray-200 border-b">
						<TabNavigation
							tabs={tabs}
							activeTab={activeTab}
							onTabChange={(tabId: string) => setActiveTab(tabId)}
						/>
					</div>

					<div className="custom-scrollbar h-96 overflow-y-auto pr-2">
						{activeTab === "summary" && summaryData?.summary && (
							<div>
								<div className="prose max-w-none text-black">
									{summaryData.summary
										.split("\n")
										.map((paragraph: string, index: number) => (
											<p key={index} className="mb-4 leading-relaxed">
												{paragraph}
											</p>
										))}
								</div>
							</div>
						)}

						{activeTab === "key-points" && summaryData?.keyPoints && (
							<div>
								<ul className="space-y-4">
									{summaryData.keyPoints.map((point: string, index: number) => (
										<li key={index} className="flex items-start">
											<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800 text-sm shadow-sm">
												{index + 1}
											</div>
											<span className="ml-4 text-black">{point}</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{activeTab === "keywords" && summaryData?.keywords && (
							<div>
								<div className="flex flex-wrap gap-3">
									{summaryData.keywords.map(
										(keyword: string, index: number) => (
											<span
												key={index}
												className="rounded-full bg-gray-100 px-4 py-2 font-medium text-black text-sm shadow-sm transition-colors hover:bg-blue-100"
											>
												{keyword}
											</span>
										),
									)}
								</div>
							</div>
						)}

						{activeTab === "transcript" && summaryData?.transcripts && (
							<div ref={transcriptContainerRef}>
								<div className="mb-3 text-gray-600 text-sm italic">
									{t("summary:transcript.click_instruction") ||
										"Click on any line to jump to that point in the video"}
								</div>

								<div className="space-y-1">
									{summaryData.transcripts.chunks.map(
										(entry: Chunk, index: number) => (
											<div
												key={index}
												className="transcript-item flex cursor-pointer rounded p-2 transition-colors hover:bg-gray-100"
												onClick={() => jumpToTime(entry.time)}
											>
												<span className="w-16 flex-shrink-0 font-mono text-gray-500 text-sm">
													{formatTime(entry.time)}
												</span>
												<p className="text-base text-black">{entry.text}</p>
											</div>
										),
									)}
								</div>
							</div>
						)}
					</div>

					<div className="mt-4 border-gray-200 border-t pt-4">
						<div className="flex space-x-4">
							<Button
								variant="outline"
								leftIcon={<File size={16} />}
								onClick={() =>
									window.open(
										`/v1/videos/summary/${summaryData.id}/download/pdf`,
										"_blank",
									)
								}
								type="button"
							>
								{t("summary:buttons.download_pdf")}
							</Button>
							<Button
								variant="primary"
								leftIcon={<Share size={16} />}
								onClick={() => {
									navigator.clipboard.writeText(
										`${window.location.origin}/summary/${summaryData.id}`,
									);
									toast.success(t("summary:messages.link_copied"));
								}}
								type="button"
							>
								{t("summary:buttons.share")}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
