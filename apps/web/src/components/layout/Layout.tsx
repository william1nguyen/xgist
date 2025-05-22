import React from "react";
import { Category } from "../../types";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  categories?: Category[];
  onCategoryClick?: (categoryId: string) => void;
}

interface LayoutProps {
  children: React.ReactNode;
  activeItem:
    | "explore"
    | "trending"
    | "summarize"
    | "library"
    | "settings"
    | "guide"
    | "upload";
  title: string;
  headerContent?: React.ReactNode;
  sidebarProps?: SidebarProps;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeItem,
  title,
  headerContent,
  sidebarProps,
}) => {
  const { t } = useTranslation(["sidebar"]);

  const defaultCategories: Category[] = [
    { id: "technology", label: t("category_technology") },
    { id: "education", label: t("category_education") },
    { id: "productivity", label: t("category_productivity") },
    { id: "finance", label: t("category_finance") },
    { id: "travel", label: t("category_travel") },
    { id: "health", label: t("category_health") },
  ];

  const categories = sidebarProps?.categories || defaultCategories;

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar
        activeItem={activeItem}
        categories={categories}
        onCategoryClick={sidebarProps?.onCategoryClick}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title}>{headerContent}</Header>

        <main className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
