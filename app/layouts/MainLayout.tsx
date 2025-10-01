"use client";

import React, { useState, useEffect, useRef } from 'react';
import TopNav from "./includes/TopNav"
import { usePathname } from "next/navigation"
import { motion } from 'framer-motion';
import { useUser } from "@/app/context/user";
import { PlayerProvider } from '@/app/context/playerContext'; 
import Link from "next/link";
import { useGeneralStore } from "../stores/general";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BsSearch } from "react-icons/bs";
import NotificationBell from "../components/notifications/NotificationBell";
import UserProfileSidebar from "../components/profile/UserProfileSidebar";
import { useProfileStore } from "@/app/stores/profile";
import AuthObserver from "@/app/components/AuthObserver";
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";
import ContentFilter from "@/app/components/ContentFilter";
import { FaInfoCircle } from "react-icons/fa";
import ClientWelcomeModal from '../components/ClientWelcomeModal'

// Local interface for profile card
interface ProfileCardProps {
  user_id: string;
  name: string;
  image: string;
  created_at?: string;
  genre?: string;
  bio?: string;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const userContext = useUser();   
    const router = useRouter();
    const { currentProfile, setCurrentProfile } = useProfileStore();
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    const { setIsLoginOpen, setIsEditProfileOpen } = useGeneralStore();
    
    // Load profile if user is authenticated
    useEffect(() => {
        if (userContext && userContext.user && userContext.user.id && !currentProfile) {
            // Add debounce to prevent multiple rapid calls
            const loadProfileWithDebounce = async () => {
                try {
                    const userId = (userContext.user as NonNullable<typeof userContext.user>).id;
                    await setCurrentProfile(userId);
                } catch (error) {
                    console.error('Error loading profile:', error);
                }
            };
            
            // Use a short timeout to debounce multiple calls
            const timeoutId = setTimeout(() => {
                loadProfileWithDebounce();
            }, 200); // 200ms debounce
            
            // Clean up timeout on unmount or when dependencies change
            return () => clearTimeout(timeoutId);
        }
    }, [userContext?.user?.id, currentProfile, setCurrentProfile]);

    // Handle welcome modal close
    const handleWelcomeModalClose = () => {
        setShowWelcomeModal(false);
    };

    return (
		<>
			<TopNav params={{ id: userContext?.user?.id as string }} />
            <AuthObserver />

		<div className="flex mx-auto w-full px-0 smooth-scroll-container content-with-top-nav">
			
			<div className="hidden md:flex w-[350px] relative">
			<motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full sticky top-0 h-screen"
            >
                {/* Profile card for desktop and iPad */}
                {userContext?.user && currentProfile && (
                  <div className="px-3">
                    <UserProfileSidebar profile={currentProfile} />
                  </div>
                )}
				{/*<SideNavMain />*/}
				{/*<MainComponentsFilter />*/}
				</motion.div>
			</div>

            <PlayerProvider>
			<div className="flex justify-center w-full px-0">
			<motion.div
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full pb-[80px] md:pb-0 content-with-bottom-nav"
            >
				{children}
				</motion.div>
			</div>
            </PlayerProvider>

			<div className="hidden md:flex w-[300px] pr-[20px]">
			<motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full"
            >
    			{/*	TOP 100 <RightSideBar /> 
                <TechMessage />*/}
                <div className="sticky top-[80px] pt-0">
                    <ContentFilter />
                </div>
                </motion.div>
			</div>

            {/* Mobile filter for smaller screens */}
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                    type: "spring", 
                    stiffness: 260, 
                    damping: 20,
                    duration: 0.5 
                }}
                className="md:hidden fixed bottom-0 left-0 right-0 z-[99998] bg-[#0F1225]/50 backdrop-blur-xl px-4 py-2 pb-2 border-t border-white/5 shadow-lg fixed-bottom-panel"
            >
                <ContentFilter />
            </motion.div>

            {/* Welcome Modal */}
            <ClientWelcomeModal 
                isVisible={showWelcomeModal} 
                onClose={handleWelcomeModalClose} 
                hideFirstVisitCheck={true}
            />
		</div>
		</>
    )
} 