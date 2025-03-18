import React from "react";
import { useTranslation } from "react-i18next";

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        className={`px-2 py-1 rounded-md text-sm ${i18n.language === "vi" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
        onClick={() => changeLanguage("vi")}
      >
        VN
      </button>
      <button
        className={`px-2 py-1 rounded-md text-sm ${i18n.language === "en" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"}`}
        onClick={() => changeLanguage("en")}
      >
        EN
      </button>
    </div>
  );
};
