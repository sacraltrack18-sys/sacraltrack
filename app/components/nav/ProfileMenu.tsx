"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";

const ProfileMenu = () => {
  const userContext = useUser();
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const { setIsLoginOpen } = useGeneralStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && 
          menuRef.current && 
          buttonRef.current && 
          !menuRef.current.contains(event.target as Node) &&
          !buttonRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Helper function for profile image URL with error handling
  const getProfileImageUrl = (imageId: string) => {
    if (!imageId || imageId.trim() === '') {
      return '/images/placeholders/user-placeholder.svg';
    }
    try {
      return createBucketUrl(imageId, 'user');
    } catch (error) {
      console.error('Error in getProfileImageUrl:', error);
      return '/images/placeholders/user-placeholder.svg';
    }
  };

  if (!userContext?.user?.id) {
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
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 
                      group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Use simpler shimmer effect with will-change for better performance */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-30"
          style={{ willChange: "transform" }}
        >
          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] 
                        bg-gradient-to-r from-transparent via-white/50 to-transparent 
                        transition-transform duration-1000 ease-in-out"></div>
        </div>
        
        <div className="flex items-center gap-2 relative z-10">
          <UserCircleIcon className="w-[20px] h-[20px] md:w-[22px] md:h-[22px] text-white group-hover:text-blue-200 
                                 transition-colors duration-300" />
          <span className="whitespace-nowrap font-medium text-[14px] hidden md:inline group-hover:text-blue-100
                        transition-colors duration-300">Log in</span>
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
          className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden ring-2 ring-[#20DDBB]/30 
                   transition-all duration-300 group-hover:ring-[#20DDBB]/50"
        >
          <img 
            className="w-full h-full object-cover"
            src={userContext?.user?.image 
              ? getProfileImageUrl(userContext.user.image)
              : '/images/placeholders/user-placeholder.svg'
            } 
            alt={userContext?.user?.name || 'User avatar'}
          />
        </motion.div>
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#20DDBB] rounded-full 
                      border-2 border-[#24183D] group-hover:scale-110 transition-transform"></div>
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
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-4 group/profile"
                >
                  <div 
                    className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-[#20DDBB]/30
                            group-hover/profile:ring-[#20DDBB]/50 transition-all duration-300
                            shadow-[0_0_15px_rgba(32,221,187,0.2)]"
                  >
                    <img 
                      className="w-full h-full object-cover"
                      src={userContext?.user?.image 
                        ? getProfileImageUrl(userContext.user.image)
                        : '/images/placeholders/user-placeholder.svg'
                      } 
                      alt={userContext?.user?.name || 'User avatar'}
                    />
                  </div>
                  <div>
                    <p className="text-white font-medium text-[15px]">
                      {userContext?.user?.name}
                    </p>
                    <span className="text-[#20DDBB] text-sm font-medium 
                              group-hover/profile:text-white transition-colors">
                      View Profile
                    </span>
                  </div>
                </Link>
              </div>

              <MenuItems setShowMenu={setShowMenu} logout={userContext?.logout} />

              <div className="px-6 pt-3 mt-2 border-t border-white/10">
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

interface MenuItemsProps {
  setShowMenu: (show: boolean) => void;
  logout?: () => void;
}

// Extract menu items to separate component to improve maintainability
const MenuItems = React.memo(({ setShowMenu, logout }: MenuItemsProps) => {
  return (
    <div className="px-3 py-2">
      <Link 
        href="/royalty"
        onClick={() => setShowMenu(false)}
        className="flex items-center gap-4 p-3 text-white/90 
                rounded-xl transition-all duration-200 group relative
                hover:text-white hover:bg-[#20DDBB]/5"
      >
        <div className="w-10 h-10 flex items-center justify-center">
          <svg className="w-6 h-6 group-hover:scale-110 transition-transform fill-current 
                        group-hover:text-[#20DDBB]" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                  className="stroke-current" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
        <span className="text-[14px] font-medium group-hover:text-[#20DDBB] 
                      transition-colors">Royalty</span>
      </Link>

      <Link 
        href="/people"
        onClick={() => setShowMenu(false)}
        className="flex items-center gap-4 p-3 text-white/90
                rounded-xl transition-all duration-200 group relative
                hover:text-white hover:bg-[#20DDBB]/5"
      >
        <div className="w-10 h-10 flex items-center justify-center">
          <svg className="w-6 h-6 group-hover:scale-110 transition-transform fill-current 
                        group-hover:text-[#20DDBB]" viewBox="0 0 24 24">
            <path d="M16 3.23c2.51 2.48 2.51 6.5 0 9-2.51 2.48-6.57 2.48-9.08 0-2.51-2.48-2.51-6.5 0-9 2.51-2.48 6.57-2.48 9.08 0z"
                  className="stroke-current" strokeWidth="1.5" fill="none"/>
            <path d="M17.82 21c0-3.47-2.85-6.29-6.36-6.29S5.1 17.53 5.1 21"
                  className="stroke-current" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
        <span className="text-[14px] font-medium group-hover:text-[#20DDBB] 
                      transition-colors">People</span>
      </Link>

      <Link 
        href="/news"
        onClick={() => setShowMenu(false)}
        className="flex items-center gap-4 p-3 text-white/90
                rounded-xl transition-all duration-200 group relative
                hover:text-white hover:bg-[#20DDBB]/5"
      >
        <div className="w-10 h-10 flex items-center justify-center">
          <svg className="w-6 h-6 group-hover:scale-110 transition-transform fill-current 
                        group-hover:text-[#20DDBB]" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"
                  className="stroke-current" strokeWidth="1.5" fill="none" 
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-[14px] font-medium group-hover:text-[#20DDBB] 
                      transition-colors">News</span>
      </Link>

      <button 
        onClick={() => { 
          logout && logout();
          setShowMenu(false);
        }}
        className="w-full flex items-center gap-4 p-3 text-white/90
                rounded-xl transition-all duration-200 group relative
                hover:text-white hover:bg-[#20DDBB]/5"
      >
        <div className="w-10 h-10 flex items-center justify-center">
          <svg className="w-6 h-6 group-hover:scale-110 transition-transform fill-current 
                        group-hover:text-[#20DDBB]" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                  className="stroke-current" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
        <span className="text-[14px] font-medium group-hover:text-[#20DDBB] 
                      transition-colors">Log Out</span>
      </button>
    </div>
  );
});

MenuItems.displayName = 'MenuItems';

export default ProfileMenu; 