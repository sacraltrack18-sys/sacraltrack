"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AUTH_STATE_CHANGE_EVENT } from "@/app/context/user";
import {
  ArrowRightOnRectangleIcon,
  CogIcon,
  MegaphoneIcon,
  MusicalNoteIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { PlusCircleIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { getProfileImageUrl } from "@/app/utils/imageUtils";

const ProfileMenu = () => {
  const userContext = useUser();
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [userState, setUserState] = useState(userContext?.user || null);
  const { setIsLoginOpen } = useGeneralStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Debug logging
  useEffect(() => {
    console.log("[ProfileMenu] User context updated:", {
      hasUser: !!userContext?.user,
      userId: userContext?.user?.id,
      userName: userContext?.user?.name,
      userImage: userContext?.user?.image,
    });
    setUserState(userContext?.user || null);
  }, [userContext?.user]);

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthStateChange = (event: CustomEvent) => {
      console.log("[ProfileMenu] Auth state change detected:", event.detail);
      const newUser = event.detail.user;
      setUserState(newUser);

      // Принудительно обновляем состояние для быстрого отображения аватарки
      if (newUser) {
        console.log("[ProfileMenu] User logged in, updating UI immediately");
        // Дополнительное обновление для гарантии
        setTimeout(() => {
          setUserState(newUser);
        }, 50);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        AUTH_STATE_CHANGE_EVENT as any,
        handleAuthStateChange,
      );
      return () => {
        window.removeEventListener(
          AUTH_STATE_CHANGE_EVENT as any,
          handleAuthStateChange,
        );
      };
    }
  }, []);

  // Дополнительный эффект для отслеживания изменений userContext
  useEffect(() => {
    if (userContext?.user && !userState) {
      console.log("[ProfileMenu] UserContext updated, syncing state");
      setUserState(userContext.user);
    }
  }, [userContext?.user, userState]);

  // Handle click outside menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMenu &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // Check both userContext and local state for user
  const currentUser = userState || userContext?.user;

  if (!currentUser?.id) {
    return (
      <motion.button
        onClick={() => setIsLoginOpen(true)}
        className="relative flex items-center justify-center overflow-hidden bg-gradient-to-r
                 from-blue-500 to-indigo-600 text-white rounded-2xl px-2 md:px-4 py-[10px]
                 shadow-lg shadow-blue-500/25 group"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Optimize animations by reducing number of animated elements */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0
                      group-hover:opacity-100 transition-opacity duration-500"
        ></div>

        {/* Use simpler shimmer effect with will-change for better performance */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-30"
          style={{ willChange: "transform" }}
        >
          <div
            className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%]
                        bg-gradient-to-r from-transparent via-white/50 to-transparent
                        transition-transform duration-1000 ease-in-out"
          ></div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <UserCircleIcon
            className="w-[20px] h-[20px] md:w-[22px] md:h-[22px] text-white group-hover:text-blue-200
                                 transition-colors duration-300"
          />
          <span
            className="whitespace-nowrap font-medium text-[14px] hidden md:inline group-hover:text-blue-100
                        transition-colors duration-300"
          >
            Log in
          </span>
        </div>
      </motion.button>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        className="relative group"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-[50px] h-[50px] rounded-xl overflow-hidden ring-[0.5px] ring-[#20DDBB]/30
                   transition-all duration-300 group-hover:ring-[#20DDBB]/50"
        >
          <img
            className="w-full h-full object-cover"
            src={
              currentUser?.image
                ? getProfileImageUrl(currentUser.image)
                : "/images/placeholders/user-placeholder.svg"
            }
            alt={userContext?.user?.name || "User avatar"}
          />
        </motion.div>
        <div
          className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#20DDBB] rounded-full
                      border-2 border-[#24183D] group-hover:scale-110 transition-transform"
        ></div>
      </button>

      {/* Profile Menu - Using CSS transitions instead of framer-motion for better performance */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 animate-fadeIn"
            onClick={() => setShowMenu(false)}
          />

          <div
            ref={menuRef}
            className="absolute right-0 mt-2 w-[280px] max-w-[90vw] bg-[#24183D] rounded-xl
                     shadow-lg z-50 overflow-hidden border border-white/10 animate-menuEnter"
            style={{ transformOrigin: "top right" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#20DDBB]/3 to-transparent pointer-events-none opacity-30"></div>

            <div className="relative flex flex-col gap-2">
              <div className="px-6 py-3 border-b border-white/5">
                <Link
                  href={`/profile/${userContext?.user?.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowMenu(false);
                    console.log(
                      `[NAV] Navigating to profile: ${userContext?.user?.id}`,
                    );
                    window.location.href = `/profile/${userContext?.user?.id}`;
                  }}
                  className="flex items-center gap-4 group/profile"
                >
                  <div
                    className="w-12 h-12 rounded-xl overflow-hidden ring-[0.5px] ring-[#20DDBB]/30
                            group-hover/profile:ring-[#20DDBB]/50 transition-all duration-300
                            shadow-[0_0_15px_rgba(32,221,187,0.2)]"
                  >
                    <img
                      className="w-full h-full object-cover"
                      src={
                        userContext?.user?.image
                          ? getProfileImageUrl(userContext.user.image)
                          : "/images/placeholders/music-user-placeholder-static.svg"
                      }
                      alt={userContext?.user?.name || "User avatar"}
                    />
                  </div>
                  <div>
                    <p className="text-white font-medium text-[15px]">
                      {userContext?.user?.name}
                    </p>
                    <span
                      className="text-[#20DDBB] text-sm font-medium
                              group-hover/profile:text-white transition-colors"
                    >
                      View Profile
                    </span>
                  </div>
                </Link>
              </div>

              <div className="px-3 py-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowMenu(false);
                    toast.success(
                      "Messages feature is under development and will be available soon. Thank you for using Sacral Track!",
                      {
                        duration: 5000,
                        style: {
                          background: "#333",
                          color: "#fff",
                          borderRadius: "10px",
                        },
                        icon: "💬",
                      },
                    );
                  }}
                  className="w-full flex items-center gap-4 p-3 text-white/90
                          rounded-xl transition-all duration-200 group relative
                          hover:text-white hover:bg-[#20DDBB]/5 text-left"
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 group-hover:scale-110 transition-transform fill-current
                                  group-hover:text-[#20DDBB]"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                        className="stroke-current"
                        strokeWidth="1.5"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span
                      className="text-[14px] font-medium group-hover:text-[#20DDBB]
                                transition-colors"
                    >
                      Messages
                    </span>
                    <span className="text-[10px] text-white/50 italic">
                      under construction
                    </span>
                  </div>
                </button>

                <Link
                  href="/royalty"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowMenu(false);
                    console.log("[NAV] Navigating to royalty");
                    window.location.href = "/royalty";
                  }}
                  className="flex items-center gap-4 p-3 text-white/90
                          rounded-xl transition-all duration-200 group relative
                          hover:text-white hover:bg-[#20DDBB]/5"
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 group-hover:scale-110 transition-transform fill-current
                                  group-hover:text-[#20DDBB]"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        className="stroke-current"
                        strokeWidth="1.5"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <span
                    className="text-[14px] font-medium group-hover:text-[#20DDBB]
                                transition-colors"
                  >
                    Royalty
                  </span>
                </Link>

                <Link
                  href="/people"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowMenu(false);
                    console.log("[NAV] Navigating to people");
                    window.location.href = "/people";
                  }}
                  className="flex items-center gap-4 p-3 text-white/90
                          rounded-xl transition-all duration-200 group relative
                          hover:text-white hover:bg-[#20DDBB]/5"
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 group-hover:scale-110 transition-transform fill-current
                                  group-hover:text-[#20DDBB]"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M16 3.23c2.51 2.48 2.51 6.5 0 9-2.51 2.48-6.57 2.48-9.08 0-2.51-2.48-2.51-6.5 0-9 2.51-2.48 6.57-2.48 9.08 0z"
                        className="stroke-current"
                        strokeWidth="1.5"
                        fill="none"
                      />
                      <path
                        d="M17.82 21c0-3.47-2.85-6.29-6.36-6.29S5.1 17.53 5.1 21"
                        className="stroke-current"
                        strokeWidth="1.5"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <span
                    className="text-[14px] font-medium group-hover:text-[#20DDBB]
                                transition-colors"
                  >
                    People
                  </span>
                </Link>

                <Link
                  href="/news"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowMenu(false);
                    console.log("[NAV] Navigating to news");
                    window.location.href = "/news";
                  }}
                  className="flex items-center gap-4 p-3 text-white/90
                          rounded-xl transition-all duration-200 group relative
                          hover:text-white hover:bg-[#20DDBB]/5"
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 group-hover:scale-110 transition-transform fill-current
                                  group-hover:text-[#20DDBB]"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"
                        className="stroke-current"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span
                    className="text-[14px] font-medium group-hover:text-[#20DDBB]
                                transition-colors"
                  >
                    News
                  </span>
                </Link>

                {/* Support Button - Neutral Color */}
                <a
                  href="http://t.me/sashaplayra"
                  target="_blank"
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-4 p-3 text-white/90
                          rounded-xl transition-all duration-200 group relative
                          hover:text-white hover:bg-gray-500/10"
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 group-hover:scale-110 transition-transform"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"
                        fill="#2AABEE"
                      />
                      <path
                        d="M9.80675 17.7853C9.49369 17.7853 9.52478 17.6733 9.40048 17.3752L8.23096 13.5159L17.1379 8.1793"
                        fill="#2AABEE"
                      />
                      <path
                        d="M9.80673 17.7852C10.0467 17.7852 10.1561 17.6704 10.2976 17.5339L12 15.8946L10.0383 14.7751"
                        fill="#2AABEE"
                      />
                      <path
                        d="M10.0383 14.7756L14.8482 18.2959C15.2967 18.5402 15.6235 18.4132 15.7317 17.7857L17.6635 8.36579C17.8227 7.59892 17.3919 7.29651 16.9637 7.49104L5.50906 11.9429C4.76029 12.1972 4.76494 12.5598 5.37162 12.7031L8.29006 13.5755L15.0474 9.24555C15.3016 9.09912 15.5345 9.17926 15.344 9.34283"
                        fill="white"
                      />
                    </svg>
                  </div>
                  <span
                    className="text-[14px] font-medium group-hover:text-[#2AABEE]
                                transition-colors"
                  >
                    Telegram Support
                  </span>
                </a>

                <button
                  onClick={() => {
                    userContext?.logout && userContext.logout();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-4 p-3 text-white/90
                          rounded-xl transition-all duration-200 group relative
                          hover:text-white hover:bg-[#20DDBB]/5"
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 group-hover:scale-110 transition-transform fill-current
                                  group-hover:text-[#20DDBB]"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                        className="stroke-current"
                        strokeWidth="1.5"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <span
                    className="text-[14px] font-medium group-hover:text-[#20DDBB]
                                transition-colors"
                  >
                    Logout
                  </span>
                </button>
              </div>

              <div className="px-6 pt-3 pb-3 mt-2 border-t border-white/10">
                <Link
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowMenu(false);
                    console.log("[NAV] Navigating to terms");
                    window.open("/terms", "_blank", "noopener,noreferrer");
                  }}
                  className="flex items-center gap-2 mb-3 text-white/90
                          transition-all duration-200 group
                          hover:text-white"
                >
                  <div className="flex items-center justify-center">
                    <DocumentTextIcon
                      className="w-4 h-4 group-hover:scale-110 transition-transform fill-current
                                  group-hover:text-[#20DDBB]"
                    />
                  </div>
                  <span
                    className="text-[13px] font-medium group-hover:text-[#20DDBB]
                                transition-colors"
                  >
                    Terms
                  </span>
                </Link>
                <div className="w-full h-px bg-white/10 mb-3"></div>
                <p className="text-[12px] text-[#818BAC] font-medium">
                  All rights © 2025 SACRAL TRACK
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileMenu;
