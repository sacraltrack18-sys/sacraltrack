"use client";

import React, { useEffect, useState } from "react";
import TopNav from "./includes/TopNav"
import { usePathname } from "next/navigation"
import { ProfilePageTypes, ProfileStore } from "../types"
import { useUser } from "@/app/context/user";
import { useProfileStore } from "@/app/stores/profile"
import { useGeneralStore } from "@/app/stores/general";
import { useUIStore } from '@/app/stores/uiStore';
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl"
import { IoSettingsOutline } from 'react-icons/io5';
import { BsPeople, BsHeart, BsVinylFill } from 'react-icons/bs';
import { RiDownloadLine } from 'react-icons/ri';
import { motion, AnimatePresence } from 'framer-motion';
import EnhancedEditProfileOverlay from "@/app/components/profile/EnhancedEditProfileOverlay";
import '@/app/globals.css';
import ProfileComponents from "./includes/ProfileComponents"
import PurchasedTracks from "@/app/components/profile/PurchasedTracks"
import useDownloadsStore from '@/app/stores/downloadsStore';
import { useLikedStore } from '@/app/stores/likedStore';
import PostLikes from "@/app/components/profile/PostLikes";
import UserProfileSidebar from "@/app/components/profile/UserProfileSidebar";
import WelcomeReleasesSkeleton from "@/app/components/profile/WelcomeReleasesSkeleton";
import { usePostStore } from "@/app/stores/post";
import FriendsTab from "@/app/components/profile/FriendsTab";
import UserActivitySidebar from "@/app/components/profile/UserActivitySidebar";
import { useVibeStore } from '@/app/stores/vibeStore';
import { MdOutlineMusicNote } from 'react-icons/md';
import UserVibes from "@/app/components/profile/UserVibes";

export default function ProfileLayout({ children, params }: { children: React.ReactNode, params: { params: { id: string } } }) {
    const pathname = usePathname()
	const contextUser = useUser();   
    const { currentProfile, hasUserReleases, setHasUserReleases } = useProfileStore();
    const { isEditProfileOpen, setIsEditProfileOpen } = useGeneralStore();
    const { showPurchases, toggleShowPurchases, setShowPurchases } = useDownloadsStore();
    const { likedPosts, isLoading: likedLoading, showLikedTracks, setShowLikedTracks, fetchLikedPosts } = useLikedStore();
    const { postsByUser } = usePostStore();
    const [showFriends, setShowFriends] = useState(false);
    const [showVibes, setShowVibes] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { fetchVibesByUser } = useVibeStore();

    // Проверяем, является ли текущий пользователь владельцем профиля
    const isProfileOwner = contextUser?.user?.id === currentProfile?.user_id;

    useEffect(() => {
        const loadLikedPosts = async () => {
            if (showLikedTracks && currentProfile?.user_id) {
                // Загружаем лайки пользователя, чей профиль просматривается
                await fetchLikedPosts(currentProfile.user_id);
            }
        };

        loadLikedPosts();
    }, [currentProfile?.user_id, showLikedTracks]);

    // Обновляем проверку наличия релизов, используя реальные данные
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            // Проверяем наличие релизов у пользователя на основе данных из postsByUser
            const hasReleases = postsByUser && postsByUser.length > 0;
            setHasUserReleases(hasReleases);
            console.log(`[ProfileLayout] User ${params.params.id} has releases: ${hasReleases} (count: ${postsByUser?.length || 0})`);
            setIsLoading(false);
        }, 600); // Сокращаем время ожидания
        
        return () => clearTimeout(timer);
    }, [postsByUser, params.params.id, setHasUserReleases]);

    return (
		<>
		<TopNav params={{ id: params.params.id }} />
		
		{isEditProfileOpen && <EnhancedEditProfileOverlay />}

		<div className="w-full mx-auto mt-[60px] px-4 md:px-8">
            <div className="max-w-[1500px] mx-auto">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left sidebar with user profile */}
                    {currentProfile && (
                        <div className="hidden md:block w-[300px] flex-shrink-0">
                            <UserProfileSidebar profile={currentProfile} />
                        </div>
                    )}
                    
                    {/* Main content area */}
                    <div className="flex-1">
                        <AnimatePresence mode="wait">
                            {showPurchases && isProfileOwner ? (
                                <motion.div
                                    key="purchased"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full"
                                >
                                    <PurchasedTracks />
                                </motion.div>
                            ) : showLikedTracks ? (
                                <motion.div
                                    key="liked"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full"
                                >
                                    <div className="max-w-[1500px] mx-auto py-6">
                                        {likedLoading ? (
                                            <div className="flex justify-center items-center min-h-[400px]">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#20DDBB]"></div>
                                            </div>
                                        ) : !likedPosts || likedPosts.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                                                <BsHeart className="w-16 h-16 text-[#20DDBB]/30 mb-4" />
                                                <p className="text-white text-lg mb-2">
                                                    {isProfileOwner ? 'You haven\'t liked any tracks yet' : 'No liked tracks yet'}
                                                </p>
                                                <p className="text-gray-400">
                                                    {isProfileOwner ? 'Start exploring and liking tracks' : 'This user hasn\'t liked any tracks'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                {likedPosts.map((post) => (
                                                    <PostLikes 
                                                        key={post.$id} 
                                                        post={post}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : showFriends ? (
                                <motion.div
                                    key="friends"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full"
                                >
                                    <div className="max-w-[1500px] mx-auto py-6">
                                        {currentProfile && (
                                            <FriendsTab profileId={currentProfile.user_id} />
                                        )}
                                    </div>
                                </motion.div>
                            ) : showVibes ? (
                                <motion.div
                                    key="vibes"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full"
                                >
                                    <div className="max-w-[1500px] mx-auto py-6">
                                        {currentProfile && (
                                            <UserVibes userId={currentProfile.user_id} isProfileOwner={isProfileOwner} />
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="main"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full"
                                >
                                    {isLoading ? (
                                        <div className="flex justify-center items-center min-h-[300px]">
                                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#20DDBB]"></div>
                                        </div>
                                    ) : hasUserReleases || (postsByUser && postsByUser.length > 0) ? (
                                        <div className="flex justify-center">
                                            <div className="max-w-full flex flex-wrap justify-center gap-8 py-4">
                                                {children}
                                            </div>
                                        </div>
                                    ) : (
                                        <WelcomeReleasesSkeleton isOwner={isProfileOwner} />
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    {/* Right sidebar with user activity */}
                    {currentProfile && (
                        <div className="hidden lg:block w-[300px] flex-shrink-0">
                            <UserActivitySidebar 
                                userId={currentProfile.user_id} 
                                isOwner={isProfileOwner} 
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>

        <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-[#24183D]/95 backdrop-blur-xl border-t border-white/5"
        >
            <div className="max-w-screen-xl mx-auto">
                <div className="flex items-center justify-between p-4">
                    {/* Профиль пользователя - видимый только на мобильных */}
                    <div className="flex items-center gap-4">
                        <motion.div 
                            whileHover={{ scale: 1.05 }}
                            className={`relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-[#20DDBB]/30 
                                     group transition-all duration-300 hover:ring-[#20DDBB]/50
                                     shadow-[0_0_15px_rgba(32,221,187,0.15)] md:hidden ${isProfileOwner ? 'cursor-pointer' : ''}`}
                            onClick={isProfileOwner ? () => setIsEditProfileOpen(true) : undefined}
                        >
                        <img 
                            src={currentProfile?.image ? useCreateBucketUrl(currentProfile.image, 'user') : '/images/placeholders/user-placeholder.svg'}
                            alt={currentProfile?.name || 'Profile'} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                        </motion.div>
                        <div className="flex flex-col md:hidden">
                            <motion.h1 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`text-lg font-bold text-white ${isProfileOwner ? 'cursor-pointer hover:text-[#20DDBB] transition-colors' : ''}`}
                                onClick={isProfileOwner ? () => setIsEditProfileOpen(true) : undefined}
                            >
                                {currentProfile?.name || 'User Name'}
                            </motion.h1>
                            
                            {/* Кнопка Edit Profile в полупрозрачном округлом табике под именем пользователя */}
                            {isProfileOwner && (
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsEditProfileOpen(true)}
                                    className="self-start mt-1 px-3 py-1 text-xs font-medium rounded-full 
                                              bg-white/10 backdrop-blur-sm text-[#20DDBB] border border-[#20DDBB]/20
                                              hover:bg-[#20DDBB]/20 transition-all duration-300 shadow-[0_0_10px_rgba(32,221,187,0.15)]"
                                >
                                    Edit Profile
                                </motion.button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setShowFriends(false);
                                setShowLikedTracks(false);
                                setShowPurchases(false);
                                setShowVibes(false);
                            }}
                            className={`group flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 ${
                                !showFriends && !showLikedTracks && !showPurchases && !showVibes
                                ? 'text-[#20DDBB] bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 shadow-[0_0_15px_rgba(32,221,187,0.1)]' 
                                : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-[#20DDBB]/5 hover:to-[#5D59FF]/5 hover:shadow-[0_0_10px_rgba(32,221,187,0.05)]'
                            }`}
                        >
                            <div className={`relative flex items-center justify-center w-7 h-7 rounded-full overflow-hidden ${!showFriends && !showLikedTracks && !showPurchases && !showVibes ? 'bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] shadow-[0_0_10px_rgba(32,221,187,0.5)]' : 'bg-white/10 group-hover:bg-gradient-to-r group-hover:from-[#20DDBB]/50 group-hover:to-[#5D59FF]/50 group-hover:shadow-[0_0_8px_rgba(32,221,187,0.3)]'} transition-all duration-300`}>
                                <motion.div 
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#20DDBB]/30 to-[#5D59FF]/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    animate={{ 
                                        rotate: !showFriends && !showLikedTracks && !showPurchases && !showVibes ? [0, 360] : [0, 0],
                                    }}
                                    transition={{ 
                                        repeat: Infinity, 
                                        repeatDelay: 3,
                                        duration: 8,
                                        ease: "linear"
                                    }}
                                />
                                <BsVinylFill 
                                    className={`w-3.5 h-3.5 transition-all duration-300 ${!showFriends && !showLikedTracks && !showPurchases && !showVibes ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} 
                                />
                            </div>
                            <span className={`hidden sm:inline font-medium ${!showFriends && !showLikedTracks && !showPurchases && !showVibes ? 'bg-clip-text text-transparent bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] drop-shadow-[0_0_1px_rgba(32,221,187,0.3)]' : 'group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-[#20DDBB]/70 group-hover:to-[#5D59FF]/70'} transition-all duration-300`}>Releases</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setShowFriends(false);
                                setShowLikedTracks(false);
                                setShowPurchases(false);
                                setShowVibes(true);
                            }}
                            className={`group flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 ${
                                showVibes
                                ? 'text-purple-400 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                                : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-purple-500/5 hover:to-indigo-500/5 hover:shadow-[0_0_10px_rgba(168,85,247,0.05)]'
                            }`}
                        >
                            <div className={`relative flex items-center justify-center w-7 h-7 rounded-full overflow-hidden ${showVibes ? 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-white/10 group-hover:bg-gradient-to-r group-hover:from-purple-500/50 group-hover:to-indigo-500/50 group-hover:shadow-[0_0_8px_rgba(168,85,247,0.3)]'} transition-all duration-300`}>
                                <motion.div 
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 to-indigo-500/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    animate={{ 
                                        scale: showVibes ? [1, 1.2, 1] : [1, 1, 1],
                                    }}
                                    transition={{ 
                                        repeat: Infinity, 
                                        repeatDelay: 1,
                                        duration: 1.5,
                                        ease: "easeInOut"
                                    }}
                                />
                                <MdOutlineMusicNote 
                                    className={`w-4 h-4 transition-all duration-300 ${showVibes ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} 
                                />
                            </div>
                            <span className={`hidden sm:inline font-medium ${showVibes ? 'bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400 drop-shadow-[0_0_1px_rgba(168,85,247,0.3)]' : 'group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400/70 group-hover:to-indigo-400/70'} transition-all duration-300`}>Vibes</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setShowFriends(false);
                                setShowLikedTracks(true);
                                setShowPurchases(false);
                                setShowVibes(false);
                            }}
                            className={`group flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 ${
                                showLikedTracks
                                ? 'text-pink-400 bg-gradient-to-r from-pink-500/10 to-purple-500/10 shadow-[0_0_15px_rgba(236,72,153,0.1)]' 
                                : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-pink-500/5 hover:to-purple-500/5 hover:shadow-[0_0_10px_rgba(236,72,153,0.05)]'
                            }`}
                        >
                            <div className={`relative flex items-center justify-center w-7 h-7 rounded-full overflow-hidden ${showLikedTracks ? 'bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]' : 'bg-white/10 group-hover:bg-gradient-to-r group-hover:from-pink-500/50 group-hover:to-purple-500/50 group-hover:shadow-[0_0_8px_rgba(236,72,153,0.3)]'} transition-all duration-300`}>
                                <motion.div 
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500/30 to-purple-500/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    animate={{ 
                                        scale: showLikedTracks ? [1, 1.2, 1] : [1, 1, 1],
                                    }}
                                    transition={{ 
                                        repeat: Infinity, 
                                        repeatDelay: 1,
                                        duration: 2,
                                        ease: "easeInOut"
                                    }}
                                />
                                <BsHeart 
                                    className={`w-3.5 h-3.5 transition-all duration-300 ${showLikedTracks ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} 
                                />
                            </div>
                            <span className={`hidden sm:inline font-medium ${showLikedTracks ? 'bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400 drop-shadow-[0_0_1px_rgba(236,72,153,0.3)]' : 'group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-pink-400/70 group-hover:to-purple-400/70'} transition-all duration-300`}>Likes</span>
                        </motion.button>
                        
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setShowFriends(true);
                                setShowLikedTracks(false);
                                setShowPurchases(false);
                                setShowVibes(false);
                            }}
                            className={`group flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 ${
                                showFriends 
                                ? 'text-blue-400 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-cyan-500/5 hover:shadow-[0_0_10px_rgba(59,130,246,0.05)]'
                            }`}
                        >
                            <div className={`relative flex items-center justify-center w-7 h-7 rounded-full overflow-hidden ${showFriends ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/10 group-hover:bg-gradient-to-r group-hover:from-blue-500/50 group-hover:to-cyan-500/50 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.3)]'} transition-all duration-300`}>
                                <motion.div 
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-cyan-500/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    animate={{ 
                                        rotate: showFriends ? [0, 360] : [0, 0],
                                    }}
                                    transition={{ 
                                        repeat: Infinity, 
                                        duration: 10,
                                        ease: "linear"
                                    }}
                                />
                                <BsPeople 
                                    className={`w-4 h-4 transition-all duration-300 ${showFriends ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} 
                                />
                            </div>
                            <span className={`hidden sm:inline font-medium ${showFriends ? 'bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 drop-shadow-[0_0_1px_rgba(59,130,246,0.3)]' : 'group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400/70 group-hover:to-cyan-400/70'} transition-all duration-300`}>Friends</span>
                        </motion.button>

                        {isProfileOwner && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setShowFriends(false);
                                    setShowLikedTracks(false);
                                    setShowPurchases(true);
                                    setShowVibes(false);
                                }}
                                className={`group flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 ${
                                    showPurchases 
                                    ? 'text-amber-400 bg-gradient-to-r from-amber-500/10 to-orange-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                                    : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-amber-500/5 hover:to-orange-500/5 hover:shadow-[0_0_10px_rgba(245,158,11,0.05)]'
                                }`}
                            >
                                <div className={`relative flex items-center justify-center w-7 h-7 rounded-full overflow-hidden ${showPurchases ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-white/10 group-hover:bg-gradient-to-r group-hover:from-amber-500/50 group-hover:to-orange-500/50 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.3)]'} transition-all duration-300`}>
                                    <motion.div 
                                        className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/30 to-orange-500/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        animate={{ 
                                            y: showPurchases ? [0, -5, 0] : [0, 0, 0],
                                        }}
                                        transition={{ 
                                            repeat: Infinity, 
                                            repeatDelay: 2,
                                            duration: 1.5,
                                            ease: "easeInOut"
                                        }}
                                    />
                                    <RiDownloadLine 
                                        className={`w-4 h-4 transition-all duration-300 ${showPurchases ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} 
                                    />
                                </div>
                                <span className={`hidden sm:inline font-medium ${showPurchases ? 'bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400 drop-shadow-[0_0_1px_rgba(245,158,11,0.3)]' : 'group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-amber-400/70 group-hover:to-orange-400/70'} transition-all duration-300`}>Purchases</span>
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
	</>
    )
}


