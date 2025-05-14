import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader, Tv } from "lucide-react";

interface PresenterItem {
  id: string;
  userId: string;
  videoId: string;
  agentId: string;
  presenterId: string;
  url: string | null;
}

interface PresenterCardProps {
  item: PresenterItem;
  viewMode: "grid" | "list";
}

export const PresenterCard: React.FC<PresenterCardProps> = ({
  item,
  viewMode,
}) => {
  const { t } = useTranslation(["summary"]);
  const navigate = useNavigate();

  const isReady = !!item.url;

  const handleCardClick = () => {
    if (isReady) {
      navigate(`/presenters/${item.id}`);
    }
  };

  if (viewMode === "grid") {
    return (
      <div
        className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
          isReady ? "cursor-pointer" : "cursor-not-allowed opacity-75"
        }`}
        onClick={handleCardClick}
      >
        <div className="relative">
          <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
            {isReady ? (
              <Tv className="text-gray-400" size={48} />
            ) : (
              <Loader className="animate-spin text-indigo-600" size={32} />
            )}
          </div>
          <div className="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-0.5 text-xs rounded-md">
            {t("summary:presenter")}
          </div>
          {!isReady && (
            <div className="absolute bottom-2 right-2 bg-yellow-500 text-white px-2 py-0.5 text-xs rounded-md">
              {t("summary:processing")}
            </div>
          )}
        </div>

        <div className="p-3">
          <p className="text-sm text-gray-600 mb-1">ID: {item.presenterId}</p>
          <p className="text-xs text-gray-500">Video ID: {item.videoId}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        isReady ? "cursor-pointer" : "cursor-not-allowed opacity-75"
      }`}
      onClick={handleCardClick}
    >
      <div className="relative w-48 flex-shrink-0">
        <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
          {isReady ? (
            <Tv className="text-gray-400" size={32} />
          ) : (
            <Loader className="animate-spin text-indigo-600" size={24} />
          )}
        </div>
        <div className="absolute top-2 left-2 bg-indigo-600 text-white px-1.5 py-0.5 text-xs rounded-md">
          {t("summary:presenter")}
        </div>
      </div>

      <div className="p-4 flex-1">
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-900">
            {item.presenterId}
          </p>
          <p className="text-xs text-gray-500">Video ID: {item.videoId}</p>
        </div>

        <div className="text-sm">
          {isReady ? (
            <span className="text-green-600 font-medium">
              {t("summary:ready")}
            </span>
          ) : (
            <span className="text-yellow-600 font-medium">
              {t("summary:processing")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
