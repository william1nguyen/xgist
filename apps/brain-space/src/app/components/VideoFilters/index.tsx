"use client";

import { useVideoStore } from "@/store/videoStore";

const CATEGORIES = [
  { id: "all", name: "Tất cả" },
  { id: "programming", name: "Lập trình" },
  { id: "math", name: "Toán học" },
  { id: "science", name: "Khoa học" },
  { id: "language", name: "Ngoại ngữ" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "popular", label: "Phổ biến" },
  { value: "views", label: "Lượt xem" },
];

export default function VideoFilters() {
  const { category, sortBy, setCategory, setSortBy, setVideos, setPage } =
    useVideoStore();

  const handleCategoryChange = async (newCategory: string) => {
    setCategory(newCategory);
    setPage(1);
    try {
      const response = await fetch(
        `/api/videos?category=${newCategory}&sort=${sortBy}&page=1`
      );
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  const handleSortChange = async (newSort: "newest" | "popular" | "views") => {
    setSortBy(newSort);
    setPage(1);
    try {
      const response = await fetch(
        `/api/videos?category=${category}&sort=${newSort}&page=1`
      );
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              category === cat.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <select
        value={sortBy}
        onChange={(e) =>
          handleSortChange(e.target.value as "newest" | "popular" | "views")
        }
        className="px-4 py-2 rounded-lg border border-gray-200 bg-white"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
