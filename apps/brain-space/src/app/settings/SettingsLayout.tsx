"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { User, Settings, VideoIcon } from "lucide-react";

const settingsNavItems = [
  {
    title: "Thông tin cá nhân",
    href: "/profile",
    icon: User,
  },
  {
    title: "Video của tôi",
    href: "/profile/videos",
    icon: VideoIcon,
  },
  {
    title: "Cài đặt",
    href: "/profile/settings",
    icon: Settings,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 hidden md:block">
            <nav className="space-y-1">
              {settingsNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-3xl">
            <div className="bg-white rounded-lg shadow p-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
