"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useState } from "react";

export default function UserMenu() {
  const { user, isLoading } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading)
    return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />;

  if (!user) {
    return (
      <a
        href="/api/auth/login"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Đăng nhập
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {user.picture ? (
          <Image
            src={user.picture}
            alt={user.name || "User avatar"}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
            {user.name?.[0] || "U"}
          </div>
        )}
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50"
          >
            <User className="w-4 h-4" />
            Trang cá nhân
          </Link>
          <a
            href="/api/auth/logout"
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </a>
        </div>
      )}
    </div>
  );
}
