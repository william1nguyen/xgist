import React from "react";
import { Category } from "../../types";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  activeItem:
    | "explore"
    | "trending"
    | "summarize"
    | "library"
    | "settings"
    | "guide";
  title: string;
  headerContent?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeItem,
  title,
  headerContent,
}) => {
  const categories: Category[] = [
    { id: "technology", label: "Công nghệ" },
    { id: "education", label: "Giáo dục" },
    { id: "productivity", label: "Năng suất" },
    { id: "finance", label: "Tài chính" },
    { id: "travel", label: "Du lịch" },
    { id: "health", label: "Sức khỏe" },
  ];

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar activeItem={activeItem} categories={categories} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title}>{headerContent}</Header>

        <main className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
