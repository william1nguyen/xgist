import React from "react";
import { FastForward } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { GuideCTAProps } from "../../types/guide";

export const GuideCTA: React.FC<GuideCTAProps> = ({ onTrySummarize }) => {
  const { t } = useTranslation(["guide"]);

  return (
    <div className="bg-indigo-600 text-white py-8 px-6 rounded-lg mt-12 mb-6">
      <div className="max-w-4xl mx-auto">
        <div className="md:flex items-center justify-between">
          <div className="mb-6 md:mb-0">
            <h3 className="text-xl font-bold mb-2">{t("cta.title")}</h3>
            <p className="text-white">{t("cta.description")}</p>
          </div>
          <Button
            variant="outline"
            className="bg-white text-indigo-700 hover:bg-gray-50 border-white font-medium"
            leftIcon={<FastForward size={18} />}
            onClick={onTrySummarize}
          >
            {t("cta.button")}
          </Button>
        </div>
      </div>
    </div>
  );
};
