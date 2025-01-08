import { Menu, Upload, Search } from "lucide-react";
import SearchBar from "./SearchBar";
import UserMenu from "./UserMenu";
import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="fixed top-0 w-full bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg lg:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/" className="text-xl font-bold">
              EduVideo
            </Link>
          </div>

          <SearchBar />

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
