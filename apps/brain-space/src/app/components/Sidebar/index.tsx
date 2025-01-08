import { Video, Heart } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="hidden lg:block w-64 fixed h-full border-r border-gray-200 bg-white">
      <div className="p-4">
        <nav className="space-y-2">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <Video className="w-5 h-5" />
            <span>Video mới</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <Heart className="w-5 h-5" />
            <span>Video đã thích</span>
          </a>
        </nav>
      </div>
    </aside>
  );
}
