import React from "react";
import { Bell, LogIn } from "lucide-react";
import { useKeycloakAuth } from "../../hooks/useKeycloakAuth";

interface HeaderProps {
  title: string;
  userEmail?: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, children }) => {
  const { user, login, isAuthenticated } = useKeycloakAuth();

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        </div>

        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <Bell className="h-6 w-6" />
          </button>

          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <span className="hidden md:inline text-sm text-gray-700">
                {user?.profile.email}
              </span>
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                {user?.profile.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <button
              onClick={() => login()}
              className="flex items-center space-x-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      {children && (
        <div className="px-4 sm:px-6 lg:px-8 py-2 border-t border-gray-200">
          {children}
        </div>
      )}
    </header>
  );
};
