import { Search } from "lucide-react";

export default function SearchBar() {
  return (
    <div className="hidden md:flex flex-1 max-w-xl mx-4">
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Tìm kiếm video..."
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
        />
        <Search className="absolute right-3 top-2.5 text-gray-400 w-5 h-5" />
      </div>
    </div>
  );
}
