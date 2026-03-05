import {
	Clock,
	Copy,
	Download,
	ExternalLink,
	FastForward,
	Lightbulb,
	MessageSquare,
	Printer,
	Share,
	Tag,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

interface KeyPoint {
	timestamp: string;
	title: string;
	content: string;
}

interface VideoSummaryProps {
	videoId: string;
	videoTitle: string;
	originalDuration: string;
	readingTime: string;
	summaryDate: string;
	summaryText: string;
	keyPoints: KeyPoint[];
	mainIdeas?: string[];
	mainKeys?: string[];
	wordCount: string;
}

export const VideoSummary: React.FC<VideoSummaryProps> = ({
	videoTitle,
	originalDuration,
	readingTime,
	summaryDate,
	summaryText,
	keyPoints,
	mainIdeas = [],
	mainKeys = [],
	wordCount,
}) => {
	const [activeSection, setActiveSection] = useState<"summary" | "key-points">(
		"summary",
	);
	const [expandedPoints, setExpandedPoints] = useState<number[]>([]);

	const togglePointExpansion = (index: number) => {
		if (expandedPoints.includes(index)) {
			setExpandedPoints(expandedPoints.filter((i) => i !== index));
		} else {
			setExpandedPoints([...expandedPoints, index]);
		}
	};

	const handleCopyToClipboard = () => {
		const content = `
# Tóm tắt: ${videoTitle}

${summaryText}

## Ý chính:
${mainIdeas.map((idea) => `- ${idea}`).join("\n")}

## Điểm chính:
${keyPoints.map((point) => `- [${point.timestamp}] ${point.title}: ${point.content}`).join("\n")}

## Từ khóa:
${mainKeys.join(", ")}
    `;

		navigator.clipboard.writeText(content);
		alert("Đã sao chép tóm tắt vào clipboard!");
	};

	return (
		<div className="rounded-lg border border-gray-200 bg-white shadow-sm">
			{/* Header */}
			<div className="rounded-t-lg bg-indigo-600 p-4 text-white">
				<div className="mb-2 flex items-center justify-between">
					<h2 className="flex items-center font-bold text-xl">
						<FastForward size={20} className="mr-2" />
						Tóm tắt AI
					</h2>
					<div className="flex items-center rounded bg-indigo-500 px-2 py-1 text-sm">
						<Clock size={14} className="mr-1" />
						<span>
							Tiết kiệm{" "}
							{Math.round(
								(Number.parseInt(originalDuration.split(":")[0], 10) * 60 +
									Number.parseInt(originalDuration.split(":")[1], 10) -
									Number.parseInt(readingTime.split(" ")[0], 10)) /
									60,
							)}{" "}
							phút
						</span>
					</div>
				</div>
				<p className="text-indigo-100 text-sm">{videoTitle}</p>
			</div>

			<div className="flex items-center justify-between border-gray-200 border-b bg-gray-50 px-4 py-2 text-gray-600 text-sm">
				<div className="flex items-center gap-4">
					<span className="flex items-center">
						<Clock size={14} className="mr-1" />
						<span>Video gốc: {originalDuration}</span>
					</span>
					<span className="flex items-center">
						<FastForward size={14} className="mr-1" />
						<span>Đọc trong: {readingTime}</span>
					</span>
					<span className="flex items-center">
						<MessageSquare size={14} className="mr-1" />
						<span>{wordCount}</span>
					</span>
				</div>
				<span className="text-xs">Tóm tắt: {summaryDate}</span>
			</div>

			<div className="flex border-gray-200 border-b">
				<button
					className={`flex-1 px-4 py-2 font-medium text-sm ${
						activeSection === "summary"
							? "border-indigo-600 border-b-2 text-indigo-600"
							: "text-gray-500 hover:text-gray-700"
					}`}
					onClick={() => setActiveSection("summary")}
				>
					Tóm tắt
				</button>
				<button
					className={`flex-1 px-4 py-2 font-medium text-sm ${
						activeSection === "key-points"
							? "border-indigo-600 border-b-2 text-indigo-600"
							: "text-gray-500 hover:text-gray-700"
					}`}
					onClick={() => setActiveSection("key-points")}
				>
					Điểm chính ({keyPoints.length})
				</button>
			</div>

			<div className="p-4">
				{activeSection === "summary" ? (
					<div>
						<div className="prose mb-6 max-w-none">
							<p className="whitespace-pre-line text-gray-800 leading-relaxed">
								{summaryText}
							</p>
						</div>

						{/* Ý chính section */}
						{mainIdeas.length > 0 && (
							<div className="mt-6 mb-6">
								<h3 className="mb-3 flex items-center font-semibold text-indigo-700 text-lg">
									<Lightbulb size={18} className="mr-2" />Ý chính
								</h3>
								<div className="space-y-2">
									{mainIdeas.map((idea, index) => (
										<div
											key={index}
											className="flex items-start rounded-lg border border-indigo-100 bg-indigo-50 p-3"
										>
											<div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800">
												{index + 1}
											</div>
											<p className="text-gray-800">{idea}</p>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Từ khóa section */}
						{mainKeys.length > 0 && (
							<div className="mt-6">
								<h3 className="mb-3 flex items-center font-semibold text-indigo-700 text-lg">
									<Tag size={18} className="mr-2" />
									Từ khóa
								</h3>
								<div className="flex flex-wrap gap-2 py-2">
									{mainKeys.map((tag, index) => (
										<span
											key={index}
											className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 text-sm"
										>
											{tag}
										</span>
									))}
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="space-y-3">
						{keyPoints.map((point, index) => (
							<div
								key={index}
								className={`overflow-hidden rounded-lg border border-gray-200 transition-all ${
									expandedPoints.includes(index) ? "shadow-sm" : ""
								}`}
							>
								<div
									className={`flex cursor-pointer items-start p-3 ${
										expandedPoints.includes(index)
											? "bg-indigo-50"
											: "hover:bg-gray-50"
									}`}
									onClick={() => togglePointExpansion(index)}
								>
									<div className="mr-3 whitespace-nowrap rounded bg-indigo-100 px-2 py-1 font-medium text-indigo-800 text-xs">
										{point.timestamp}
									</div>
									<div className="flex-1">
										<h4 className="font-medium text-gray-900">{point.title}</h4>
										{expandedPoints.includes(index) && (
											<p className="mt-2 text-gray-600 text-sm">
												{point.content}
											</p>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="rounded-b-lg border-gray-200 border-t bg-gray-50 p-4">
				<div className="flex flex-wrap gap-2">
					<div className="mr-auto inline-flex items-center">
						<button className="rounded p-1.5 text-gray-500 hover:text-indigo-600">
							<ThumbsUp size={18} />
						</button>
						<button className="rounded p-1.5 text-gray-500 hover:text-red-500">
							<ThumbsDown size={18} />
						</button>
						<span className="ml-2 text-gray-500 text-xs">
							Đánh giá tóm tắt này
						</span>
					</div>

					<button
						className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
						onClick={handleCopyToClipboard}
					>
						<Copy size={14} />
						<span>Sao chép</span>
					</button>
					<button className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
						<Share size={14} />
						<span>Chia sẻ</span>
					</button>
					<button className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
						<Download size={14} />
						<span>Tải xuống</span>
					</button>
					<button className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
						<Printer size={14} />
						<span>In</span>
					</button>
					<button className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
						<ExternalLink size={14} />
					</button>
				</div>
			</div>
		</div>
	);
};
