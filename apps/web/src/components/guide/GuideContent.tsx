import React from "react";
import {
  CheckCircle2,
  PlayCircle,
  Upload,
  Key,
  FileText,
  ChevronRight,
  FastForward,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { GuideContentProps } from "../../types/guide";

export const GuideContent: React.FC<GuideContentProps> = ({
  guide,
  isActive,
  onNavigate,
  onNextGuide,
}) => {
  const { t } = useTranslation(["guide"]);

  if (!isActive) return null;

  const getActionButton = () => {
    switch (guide.id) {
      case 1:
        return (
          <Button
            variant="primary"
            leftIcon={<PlayCircle size={16} />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            onClick={() => onNavigate("/summarize?source=youtube")}
          >
            {t("buttons.summarizeYoutube")}
          </Button>
        );
      case 2:
        return (
          <Button
            variant="primary"
            leftIcon={<Upload size={16} />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            onClick={() => onNavigate("/summarize?source=upload")}
          >
            {t("buttons.uploadVideo")}
          </Button>
        );
      case 3:
        return (
          <Button
            variant="primary"
            leftIcon={<Key size={16} />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            onClick={() => onNavigate("/summarize?advanced=true")}
          >
            {t("buttons.exploreAdvanced")}
          </Button>
        );
      case 4:
        return (
          <Button
            variant="primary"
            leftIcon={<FileText size={16} />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            onClick={() => onNavigate("/library")}
          >
            {t("buttons.goToLibrary")}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center mb-6">
        {guide.icon}
        <h2 className="text-2xl font-bold ml-4 text-gray-900">{guide.title}</h2>
      </div>

      <p className="text-gray-700 mb-6">{guide.description}</p>

      <div className="space-y-4 mb-8">
        {guide.steps.map((step, index) => (
          <div key={index} className="flex items-start">
            <div className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1 font-medium">
              {index + 1}
            </div>
            <p className="ml-3 text-gray-800">{step}</p>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50 p-4 rounded-lg">
        <h3 className="font-medium flex items-center text-indigo-700 mb-2">
          <CheckCircle2 size={18} className="mr-2" />
          {t("tips.title")}
        </h3>
        <p className="text-sm text-gray-700">{t(`tips.guide${guide.id}`)}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {getActionButton()}
        <Button
          variant="outline"
          leftIcon={
            guide.id < 4 ? (
              <ChevronRight size={16} />
            ) : (
              <FastForward size={16} />
            )
          }
          className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-medium"
          onClick={onNextGuide}
        >
          {guide.id < 4 ? t("buttons.nextGuide") : t("buttons.startOver")}
        </Button>
      </div>
    </div>
  );
};
