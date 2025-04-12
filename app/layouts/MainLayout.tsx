"use client";

import React, { useState, useEffect } from 'react';
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
import { useOnboarding } from "@/app/context/OnboardingContext";
import { OnboardingGuide } from "@/app/components/onboarding/OnboardingGuide";

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
    const { setIsVisible } = useOnboarding();

    const { setIsLoginOpen, setIsEditProfileOpen } = useGeneralStore();
    
    // Load profile if user is authenticated
    useEffect(() => {
        if (userContext && userContext.user && userContext.user.id && !currentProfile) {
            const loadProfile = async () => {
                try {
                    const userId = (userContext.user as NonNullable<typeof userContext.user>).id;
                    await setCurrentProfile(userId);
                } catch (error) {
                    console.error('Error loading profile:', error);
                }
            };
            loadProfile();
        }
    }, [userContext?.user?.id, currentProfile, setCurrentProfile]);

    return (
		<>
			<TopNav params={{ id: userContext?.user?.id as string }} />
            <AuthObserver />
            <OnboardingGuide />

		<div className="flex mx-auto w-full px-0">
			
			<div className="hidden md:flex w-[350px] relative">
			<motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full sticky top-0 h-screen"
            >
                {/* Profile card for desktop and iPad */}
                {userContext?.user && currentProfile && (
                  <div className="pt-[80px] px-3">
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
                className="w-full"
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
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0F1225]/90 backdrop-blur-lg px-4 py-3 pb-4 border-t border-white/10">
                <ContentFilter />
            </div>

            {/* Onboarding Button */}
            <motion.button
                onClick={() => setIsVisible(true)}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                whileHover={{ 
                    scale: 1.05, 
                    y: -5,
                    boxShadow: '0 10px 25px rgba(32, 221, 187, 0.3)'
                }}
                className="fixed md:bottom-5 md:left-5 md:w-20 md:h-20 bottom-[80px] left-4 w-16 h-16 bg-gradient-to-r from-[#20DDBB]/80 to-[#018CFD]/80 backdrop-blur-sm text-white rounded-full flex items-center justify-center cursor-pointer border border-[#20DDBB]/30 shadow-lg z-50 transition-all duration-300 group"
            >   
                <div className="flex flex-col items-center">
                    <FaInfoCircle className="w-4 h-4 md:w-5 md:h-5 mb-1 drop-shadow-md" />
                    <span className="text-[10px] md:text-xs font-medium">Guide</span>
                </div>
                <span className="absolute left-full ml-2 px-2 py-1 bg-[#1A2338] rounded text-sm whitespace-nowrap
                              opacity-0 group-hover:opacity-100 transition-opacity">
                    Show Guide
                </span>
            </motion.button>
		</div>
		</>
    )
} 