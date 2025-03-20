import React, { useEffect, useState } from "react";
import { Bell, LogIn } from "lucide-react";
import { useKeycloakAuth } from "../../hooks/useKeycloakAuth";
import { io, Socket } from "socket.io-client";
import { env } from "../../config/env";
import { httpClient } from "../../config/httpClient";

interface Notification {
  id: string;
  key: string;
  timestamp: string;
  message: string;
  read: boolean;
}

interface HeaderProps {
  title: string;
  userEmail?: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, children }) => {
  const { user, login, isAuthenticated } = useKeycloakAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const getNotifications = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const res = await httpClient.get(
        `${env.VITE_BASE_URL}/v1/videos/notifications`
      );

      const data = res.data.notifications;

      setNotifications(data);

      const unreadNotifications = data.filter(
        (notification: Notification) => !notification.read
      );
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error("Error fetching initial notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    getNotifications();

    const notificationSocket = io(env.VITE_BASE_URL, {
      withCredentials: false,
      transports: ["polling", "websocket"],
    });

    notificationSocket.on("notification", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    setSocket(notificationSocket);

    return () => {
      notificationSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  const updateNotification = (notification: Notification) => {
    if (!notification.read) {
      socket?.emit("notification-readed", {
        key: notification.key,
      });
    }

    return notification;
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (showNotifications) {
      setUnreadCount(0);

      const updatedNotifications = notifications.map((notification) => {
        return updateNotification(notification);
      });

      setNotifications(updatedNotifications);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  return (
    <header className="bg-white shadow-sm z-10 relative">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        </div>
        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          <div className="relative">
            <button
              onClick={handleNotificationClick}
              className="p-1 rounded-full hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 relative"
            >
              <Bell className="h-6 w-6 text-green-500" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex items-center justify-center h-4 w-4 rounded-full bg-green-500 text-white text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-20 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 bg-green-50">
                  <h3 className="text-sm font-medium text-green-800">
                    Notifications
                  </h3>
                </div>
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No notifications
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${notification.read ? "bg-white" : "bg-green-50"}`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <p className="text-sm font-medium text-gray-800">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(
                            parseInt(notification.timestamp)
                          ).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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
