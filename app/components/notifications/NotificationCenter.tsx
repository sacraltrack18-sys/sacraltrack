"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BsBell,
  BsCheckCircle,
  BsCashStack,
  BsMic,
  BsPersonPlus,
  BsFileText,
  BsUpload,
  BsCart,
  BsGift,
} from "react-icons/bs";
import Link from "next/link";
// Custom time formatting function to replace date-fns
const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return "just now";
  if (diffInMinutes < 60)
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  if (diffInDays < 7)
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
};
import { useNotifications } from "@/app/hooks/useNotifications";
import { useUser } from "@/app/context/user";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter = ({ isOpen, onClose }: NotificationCenterProps) => {
  const [filter, setFilter] = useState<
    "all" | "sale" | "royalty" | "withdrawal" | "release" | "purchase" | "terms"
  >("all");
  const { getUserNotifications, markAsRead, notifications, unreadCount } =
    useNotifications();
  const { user } = useUser() || {};
  // Create a ref for the dropdown container to detect clicks outside
  const notificationRef = useRef<HTMLDivElement>(null);

  // Effect to detect clicks outside the notifications panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user?.id && isOpen) {
        // Просто обновляем состояние в хуке useNotifications
        await getUserNotifications(user.id);
      }
    };

    fetchNotifications();
  }, [isOpen, user?.id, getUserNotifications]);

  // Lock body scroll when notifications are open only on mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 640; // sm breakpoint is 640px
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "sale":
        return <BsMic className="text-blue-400" />;
      case "royalty":
        return <BsCashStack className="text-green-400" />;
      case "withdrawal":
        return <BsCheckCircle className="text-purple-400" />;
      case "welcome":
        return <BsPersonPlus className="text-yellow-400" />;
      case "release":
        return <BsUpload className="text-pink-400" />;
      case "purchase":
        return <BsCart className="text-indigo-400" />;
      case "terms":
        return <BsFileText className="text-orange-400" />;
      case "gift":
        return <BsGift className="text-red-400" />;
      default:
        return <BsBell className="text-gray-400" />;
    }
  };

  const filteredNotifications = notifications.filter(
    (n) => filter === "all" || n.type === filter,
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:hidden fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      <motion.div
        ref={notificationRef}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed sm:absolute top-[60px] sm:top-12 right-2 sm:right-6 w-full sm:w-[400px] md:w-[430px] max-w-[95vw] min-w-[320px] h-[calc(100vh-60px)] sm:h-auto bg-[#272B43] sm:rounded-2xl shadow-2xl border border-[#3f2d63] z-50"
      >
        <div className="p-3 sm:p-4 border-b border-[#3f2d63]">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-white text-base sm:text-lg font-bold">
              Notifications
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-[#818BAC] hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-1.5 sm:gap-2 flex-wrap overflow-x-auto pb-2 -mx-1 px-1">
            {[
              { id: "all", label: "All" },
              { id: "sale", label: "Sales" },
              { id: "purchase", label: "Purchases" },
              { id: "royalty", label: "Royalties" },
              { id: "release", label: "Releases" },
              { id: "withdrawal", label: "Withdrawals" },
              { id: "welcome", label: "System" },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setFilter(type.id as any)}
                className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap ${
                  filter === type.id
                    ? "bg-[#20DDBB] text-black"
                    : "bg-[#1A2338] text-[#818BAC] hover:text-white"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[70vh] sm:max-h-[60vh] overflow-y-auto">
          <AnimatePresence>
            {filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-[#818BAC]">
                No notifications
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-3 sm:p-4 border-b border-[#3f2d63] hover:bg-[#1A2338] transition-colors cursor-pointer ${
                    !notification.isRead ? "bg-[#1A2338]/50" : ""
                  }`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className="mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1 text-sm sm:text-base">
                        {notification.title}
                      </h3>
                      <p className="text-[#818BAC] text-xs sm:text-sm mb-2">
                        {notification.message}
                      </p>
                      {notification.track_id && (
                        <Link
                          href={`/track/${notification.track_id}`}
                          className="text-[#20DDBB] text-xs sm:text-sm hover:underline"
                        >
                          View Track
                        </Link>
                      )}
                      <p className="text-[#818BAC] text-xs mt-2">
                        {notification.createdAt
                          ? formatTimeAgo(new Date(notification.createdAt))
                          : "Just now"}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-[#20DDBB]" />
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

export default NotificationCenter;
