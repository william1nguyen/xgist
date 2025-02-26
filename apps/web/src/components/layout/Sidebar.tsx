import React from "react";
import {
  FastForward,
  TrendingUp,
  Zap,
  BookOpen,
  Settings,
  LogOut,
  Video,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useKeycloakAuth } from "../../hooks/useKeycloakAuth";

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
}

export const Sidebar: React.FC<SidebarProps> = ({ activeItem, categories }) => {
  const { isAuthenticated, login, logout } = useKeycloakAuth();
  const navigate = useNavigate();
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
            <span className="hidden md:inline">Khám phá</span>
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
            <span className="hidden md:inline">Xu hướng</span>
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
            <span className="hidden md:inline">Tạo tóm tắt</span>
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
            <span className="hidden md:inline">Thư viện</span>
          </Link>

          <div className="pt-4 mt-4 border-t border-slate-700">
            <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:block">
              Danh mục
            </h3>

            <div className="mt-3 space-y-1">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.id}`}
                  className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <span className="truncate hidden md:inline">
                    {category.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>

      <div className="p-4 border-t border-slate-700">
        <Link
          to="/settings"
          className="flex items-center px-2 py-2 mb-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
        >
          <Settings className="mr-3 h-5 w-5 text-slate-400" />
          <span className="hidden md:inline">Cài đặt</span>
        </Link>
        <button
          className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer w-full text-left"
          onClick={() => (isAuthenticated ? logout() : login())}
        >
          <LogOut className="mr-3 h-5 w-5 text-slate-400" />
          <span className="hidden md:inline">
            {isAuthenticated ? "Đăng xuất" : "Đăng nhập"}
          </span>
        </button>
      </div>
    </div>
  );
};
