import { Download, Eye, FastForward, Share, Trash } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { VideoItem } from "../../types";

interface VideoCardProps {
	item: VideoItem & {
		formattedViews?: string;
		creatorName?: string;
		creatorAvatar?: string;
		summarized?: boolean;
		size?: string;
		format?: string;
		resolution?: string;
	};
	viewMode: "grid" | "list";
	isSelected: boolean;
	onSelect: (id: string) => void;
	contentType: "video" | "summary" | "bookmark";
	onDelete?: (id: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
	item,
	viewMode,
	contentType,
	onDelete,
}) => {
	const navigate = useNavigate();
	const { t, i18n } = useTranslation(["common", "videos"]);

	const formatDate = (dateString: string | null | undefined) => {
		if (!dateString) return "N/A";
		const date = new Date(dateString);
		return date.toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const handleCardClick = (e: React.MouseEvent) => {
		if (
			(e.target as HTMLElement).closest('input[type="checkbox"]') ||
			(e.target as HTMLElement).closest("button")
		) {
			return;
		}

		navigate(`/videos/${item.id}`);
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onDelete) {
			onDelete(item.id);
		}
	};

	const formatViewCount = () => {
		if (item.formattedViews) return item.formattedViews;
		if (item.views) return t("videos:card.viewCount", { count: item.views });
		return "";
	};

	if (viewMode === "grid") {
		return (
			<div
				className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
				onClick={handleCardClick}
			>
				<div className="relative">
					<img
						src={item.thumbnail}
						alt={item.title}
						className="h-40 w-full object-cover"
					/>
					{(item.summarized || item.isSummarized) && (
						<div className="absolute top-2 left-2 flex items-center rounded-md bg-indigo-600 px-2 py-0.5 text-white text-xs">
							<FastForward size={12} className="mr-1" />
							{t("videos:card.summarized")}
						</div>
					)}
				</div>

				<div className="p-3">
					<h3 className="mb-1 line-clamp-2 h-12 font-medium text-gray-900">
						{item.title}
					</h3>

					<div className="mb-2 flex items-center text-gray-500 text-xs">
						{contentType === "video" && (item.formattedViews || item.views) && (
							<>
								<span>{formatViewCount()}</span>
								<span className="mx-1">•</span>
							</>
						)}
						<span>{formatDate(item.createdTime || item.createdTime)}</span>
					</div>

					<div className="flex items-center justify-between">
						{contentType === "video" && (item.creatorName || item.creator) && (
							<div className="flex items-center">
								<div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 font-medium text-white text-xs">
									{item.creatorAvatar ||
										(item.creator
											? item.creator.username.substring(0, 2).toUpperCase()
											: "N/A")}
								</div>
								<span className="truncate text-gray-700 text-sm">
									{item.creatorName ||
										(item.creator ? item.creator.username : "N/A")}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="flex cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
			onClick={handleCardClick}
		>
			<div className="relative w-48 flex-shrink-0">
				<img
					src={item.thumbnail}
					alt={item.title}
					className="h-28 w-full object-cover"
				/>
				{(item.summarized || item.isSummarized) && (
					<div className="absolute top-2 left-2 flex items-center rounded-md bg-indigo-600 px-1.5 py-0.5 text-white text-xs">
						<FastForward size={10} className="mr-1" />
						{t("videos:card.summarized")}
					</div>
				)}
			</div>

			<div className="flex-1 p-4">
				<h3 className="mb-2 line-clamp-1 font-medium text-gray-900">
					{item.title}
				</h3>

				<div className="mb-2 flex items-center text-gray-500 text-xs">
					{contentType === "video" && (item.formattedViews || item.views) && (
						<>
							<span>{formatViewCount()}</span>
							<span className="mx-2">•</span>
						</>
					)}
					<span>{formatDate(item.createdTime || item.createdTime)}</span>
					<span className="mx-2">•</span>
					{contentType === "video" ? (
						<span>
							{item.format || "MP4"}, {item.resolution || "HD"}
						</span>
					) : (
						<span>{item.format || "TXT"}</span>
					)}
					<span className="mx-2">•</span>
					{item.size ? <span>{item.size}</span> : <span>--</span>}
				</div>

				<div className="flex items-center justify-between">
					{contentType === "video" && (item.creatorName || item.creator) && (
						<div className="flex items-center">
							<div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 font-medium text-white text-xs">
								{item.creatorAvatar ||
									(item.creator
										? item.creator.username.substring(0, 2).toUpperCase()
										: "N/A")}
							</div>
							<span className="truncate text-gray-700 text-sm">
								{item.creatorName ||
									(item.creator ? item.creator.username : "N/A")}
							</span>
						</div>
					)}
					<div
						className="flex items-center space-x-3"
						onClick={(e) => e.stopPropagation()}
					>
						<button className="flex items-center p-1.5 text-gray-400 hover:text-gray-700">
							<Eye size={16} className="mr-1" />
							<span className="text-xs">{t("videos:actions.view")}</span>
						</button>
						<button className="flex items-center p-1.5 text-gray-400 hover:text-gray-700">
							<Download size={16} className="mr-1" />
							<span className="text-xs">{t("videos:actions.download")}</span>
						</button>
						<button className="flex items-center p-1.5 text-gray-400 hover:text-gray-700">
							<Share size={16} className="mr-1" />
							<span className="text-xs">{t("videos:actions.share")}</span>
						</button>
						<button
							className="flex items-center p-1.5 text-gray-400 hover:text-red-500"
							onClick={handleDelete}
						>
							<Trash size={16} className="mr-1" />
							<span className="text-xs">{t("videos:actions.delete")}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
