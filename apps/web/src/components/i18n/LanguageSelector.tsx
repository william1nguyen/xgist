import React from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  compact = false,
}) => {
  const { i18n } = useTranslation(["common"]);

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  const isEnglish = i18n.language.startsWith("en");
  const isVietnamese = !isEnglish;

  return (
    <div className="flex items-center">
      {!compact && <Globe className="mr-2 h-4 w-4 text-slate-400" />}

      <div className="flex space-x-1">
        <button
          className={`px-2 py-1 rounded-md text-xs ${
            isVietnamese
              ? "bg-indigo-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
          onClick={() => changeLanguage("vi")}
        >
          VI
        </button>
        <button
          className={`px-2 py-1 rounded-md text-xs ${
            isEnglish
              ? "bg-indigo-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
          onClick={() => changeLanguage("en")}
        >
          EN
        </button>
      </div>
    </div>
  );
};
