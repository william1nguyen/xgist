import React from "react";
import {
  FastForward,
  Settings,
  LogOut,
  Video,
  Globe,
  TrendingUp,
  Zap,
  BookOpen,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useKeycloakAuth } from "../../hooks/useKeycloakAuth";
import { LanguageSelector } from "../i18n/LanguageSelector";

export interface Category {
  id: string;
  label: string;
}

interface SidebarProps {
  activeItem:
    | "explore"
    | "trending"
    | "summarize"
    | "library"
    | "settings"
    | "guide";
  categories: Category[];
  onCategoryClick?: (categoryId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeItem,
  categories,
  onCategoryClick,
}) => {
  const { t } = useTranslation(["sidebar", "common"]);
  const { isAuthenticated, login, logout } = useKeycloakAuth();
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId: string) => {
    if (onCategoryClick) {
      onCategoryClick(categoryId);
    } else {
      navigate(`/explore?category=${categoryId}`);
    }
  };

  return (
    <div className="w-16 md:w-60 bg-slate-900 text-white flex flex-col">
      <button
        className="p-4 border-b border-slate-700 flex items-center space-x-3"
        onClick={() => navigate("/")}
      >
        <FastForward className="text-indigo-500" size={24} />
        <span className="hidden md:inline font-bold text-lg">VideoSum.AI</span>
      </button>

      <div className="flex-1 py-6 overflow-y-auto">
        <nav className="px-2 space-y-1">
          <Link
            to="/explore"
            className={`flex items-center px-2 py-3 text-sm font-medium rounded-md ${
              activeItem === "explore"
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Video className="mr-3 h-5 w-5 text-slate-400" />
            <span className="hidden md:inline">
              {t("explore", { ns: "sidebar" })}
            </span>
          </Link>

          <Link
            to="/trending"
            className={`flex items-center px-2 py-3 text-sm font-medium rounded-md ${
              activeItem === "trending"
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <TrendingUp className="mr-3 h-5 w-5 text-slate-400" />
            <span className="hidden md:inline">
              {t("trending", { ns: "sidebar" })}
            </span>
          </Link>

          <Link
            to="/summarize"
            className={`flex items-center px-2 py-3 text-sm font-medium rounded-md ${
              activeItem === "summarize"
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Zap className="mr-3 h-5 w-5 text-slate-400" />
            <span className="hidden md:inline">
              {t("create_summary", { ns: "sidebar" })}
            </span>
          </Link>

          <Link
            to="/library"
            className={`flex items-center px-2 py-3 text-sm font-medium rounded-md ${
              activeItem === "library"
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <BookOpen className="mr-3 h-5 w-5 text-slate-400" />
            <span className="hidden md:inline">
              {t("library", { ns: "sidebar" })}
            </span>
          </Link>

          <div className="pt-4 mt-4 border-t border-slate-700">
            <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:block">
              {t("categories", { ns: "sidebar" })}
            </h3>

            <div className="mt-3 space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <span className="truncate hidden md:inline">
                    {t(`category_${category.id}`, { ns: "sidebar" })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* Thêm Language Selector và các button khác vào phần footer */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-slate-300">
          <Globe className="mr-3 h-5 w-5 text-slate-400" />
          <span className="hidden md:inline">
            {t("language", { ns: "common" })}
          </span>
          <div className="ml-auto">
            <LanguageSelector compact={true} />
          </div>
        </div>

        <Link
          to="/settings"
          className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
        >
          <Settings className="mr-3 h-5 w-5 text-slate-400" />
          <span className="hidden md:inline">
            {t("settings", { ns: "common" })}
          </span>
        </Link>

        <button
          className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer w-full text-left"
          onClick={() => (isAuthenticated ? logout() : login())}
        >
          <LogOut className="mr-3 h-5 w-5 text-slate-400" />
          <span className="hidden md:inline">
            {isAuthenticated
              ? t("logout", { ns: "common" })
              : t("login", { ns: "common" })}
          </span>
        </button>
      </div>
    </div>
  );
};
