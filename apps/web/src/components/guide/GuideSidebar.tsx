import React from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GuideNavButton } from "./GuideNavButton";
import { Guide } from "../../types/guide";

interface GuideSidebarProps {
  guides: Guide[];
  activeGuide: number;
  onGuideSelect: (id: number) => void;
}

export const GuideSidebar: React.FC<GuideSidebarProps> = ({
  guides,
  activeGuide,
  onGuideSelect,
}) => {
  const { t } = useTranslation(["guide"]);

  return (
    <div className="md:col-span-1 space-y-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">
        {t("selectGuide")}
      </h2>

      {guides.map((guide) => (
        <GuideNavButton
          key={guide.id}
          guide={guide}
          isActive={activeGuide === guide.id}
          onClick={() => onGuideSelect(guide.id)}
        />
      ))}

      <div className="bg-indigo-50 p-4 rounded-lg mt-6">
        <h3 className="font-medium flex items-center text-indigo-700">
          <Clock size={18} className="mr-2" />
          {t("timeSaver.title")}
        </h3>
        <p className="text-sm text-gray-700 mt-2">
          {t("timeSaver.description")}
        </p>
      </div>
    </div>
  );
};
