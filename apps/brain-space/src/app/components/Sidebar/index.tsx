"use client";

import { Video, Heart, Clock, BarChart2, ViewIcon } from "lucide-react";
import { useVideoStore } from "@/store/videoStore";

export default function Sidebar() {
  const { sortBy, setSortBy } = useVideoStore();

  const navItems = [
    {
      key: "newest" as const,
      icon: Clock,
      label: "Video mới nhất",
    },
    {
      key: "popular" as const,
      icon: Heart,
      label: "Video phổ biến",
    },
    {
      key: "views" as const,
      icon: BarChart2,
      label: "Xem nhiều nhất",
    },
  ];

  return (
    <aside className="hidden lg:block w-64 fixed h-full border-r border-gray-200 bg-white">
      <div className="p-4">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setSortBy(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                sortBy === item.key
                  ? "bg-gray-100 text-blue-600"
                  : "text-gray-700"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
