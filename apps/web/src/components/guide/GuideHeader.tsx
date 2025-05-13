import React from "react";
import { ChevronLeft, FastForward } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { GuideHeaderProps } from "../../types/guide";

export const GuideHeader: React.FC<GuideHeaderProps> = ({
  onGoBack,
  onTryNow,
}) => {
  const { t } = useTranslation(["guide"]);

  return (
    <>
      <button
        className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4 font-medium"
        onClick={onGoBack}
      >
        <ChevronLeft size={18} />
        <span className="ml-1">{t("goBack")}</span>
      </button>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-lg p-8 mb-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold mb-4">{t("header.title")}</h1>
          <p className="text-lg mb-6 text-white">{t("header.description")}</p>
          <div className="flex gap-4">
            <Button
              variant="primary"
              leftIcon={<FastForward size={18} />}
              className="text-indigo-700 hover:bg-gray-50 font-medium"
              onClick={onTryNow}
            >
              {t("header.tryNow")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
