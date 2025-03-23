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
import EnhancedUserProfileCard from "../components/EnhancedUserProfileCard";
import { useProfileStore } from "@/app/stores/profile";
import AuthObserver from "@/app/components/AuthObserver";

// Локальный интерфейс для карточки профиля
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

    const { setIsLoginOpen } = useGeneralStore();
    
    // Загружаем профиль, если пользователь авторизован
    useEffect(() => {
        if (userContext?.user?.id && !currentProfile) {
            setCurrentProfile(userContext.user.id);
        }
    }, [userContext?.user?.id, currentProfile, setCurrentProfile]);

    return (
		<>
			<TopNav params={{ id: userContext?.user?.id as string }} />
            <AuthObserver />

		<div className="flex mx-auto w-full px-0">
			
			<div className="hidden md:flex w-[300px]">
			<motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                      className="w-full"
            >
                {/* Профильная карточка для десктопа и iPad */}
                {userContext?.user && currentProfile && (
                  <div className="pt-[80px] mb-6 px-3">
                    <EnhancedUserProfileCard profile={{
                      user_id: userContext.user.id,
                      name: currentProfile.name || 'User',
                      image: currentProfile.image || '',
                      created_at: currentProfile.created_at || new Date().toISOString(),
                      genre: currentProfile.genre || '',
                      bio: currentProfile.bio || ''
                    } as ProfileCardProps} />
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
                </motion.div>
			</div>

            {/* Support button */}
            <motion.a
                href="http://t.me/sashaplayra"
                target="_blank"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="fixed bottom-5 right-5 bg-transparent text-white rounded-full w-20 h-20 flex items-center justify-center cursor-pointer hover:bg-[#1E2136] focus:outline-none"
            >   
                <div className="flex flex-col items-center">
                    <img src="/images/tel.svg" className="w-4 h-4 mb-1" alt="" />
                    <span className="text-[10px]">Support</span>
                </div>
            </motion.a>
		</div>
		</>
    )
} 