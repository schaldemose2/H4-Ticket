"use client";

import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

type Notification = {
  id: string;
  ticket_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const markAsRead = async (id?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors focus:outline-none"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-lg border border-zinc-200 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
              <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead()}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                >
                  <Check className="h-3 w-3 mr-1" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-zinc-500">
                  No notifications yet.
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-zinc-50 transition-colors ${
                        !notification.is_read ? "bg-indigo-50/30" : ""
                      }`}
                    >
                      <Link
                        href={`/tickets/${notification.ticket_id}`}
                        onClick={() => {
                          if (!notification.is_read) markAsRead(notification.id);
                          setIsOpen(false);
                        }}
                        className="block"
                      >
                        <div className="flex justify-between items-start">
                          <p className={`text-sm ${!notification.is_read ? "font-medium text-zinc-900" : "text-zinc-700"}`}>
                            {notification.message}
                          </p>
                          {!notification.is_read && (
                            <span className="h-2 w-2 mt-1.5 rounded-full bg-indigo-600 flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          {format(new Date(notification.created_at), "MMM d, HH:mm")}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-4 py-2 border-t border-zinc-200 bg-zinc-50 text-center">
              <Link
                href="/settings/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs text-zinc-500 hover:text-zinc-700 font-medium"
              >
                Notification Settings
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
