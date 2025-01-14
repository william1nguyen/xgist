"use client";

import { Menu, Upload, Search } from "lucide-react";
import Link from "next/link";
import { useVideoStore } from "@/store/videoStore";
import UserMenu from "./UserMenu";

export default function Navigation() {
  const { searchQuery, setSearchQuery } = useVideoStore();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <nav className="fixed top-0 w-full bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg lg:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/" className="text-xl font-bold">
              EduVideo
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Tìm kiếm video..."
                className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/upload"
              className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Upload className="w-5 h-5" />
              Đăng video
            </Link>
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
