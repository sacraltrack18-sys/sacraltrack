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
import EditProfileOverlay from "@/app/components/profile/EditProfileOverlay";
import '@/app/globals.css';
import ProfileComponents from "./includes/ProfileComponents"
import PurchasedTracks from "@/app/components/profile/PurchasedTracks"
import useDownloadsStore from '@/app/stores/downloadsStore';
import { useLikedStore } from '@/app/stores/likedStore';
import PostLikes from "@/app/components/profile/PostLikes";

export default function ProfileLayout({ children, params }: { children: React.ReactNode, params: { params: { id: string } } }) {
    const pathname = usePathname()
	const contextUser = useUser();   
    const { currentProfile } = useProfileStore() as ProfileStore;
    const { isEditProfileOpen, setIsEditProfileOpen } = useGeneralStore();
    const { showPurchases, toggleShowPurchases } = useDownloadsStore();
    const { likedPosts, isLoading: likedLoading, showLikedTracks, setShowLikedTracks, fetchLikedPosts } = useLikedStore();
    const [showFriends, setShowFriends] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

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

    // Получаем URL изображения
    const profileImage = currentProfile?.image 
        ? useCreateBucketUrl(currentProfile.image) // Если есть ID изображения, получаем URL
        : '/images/placeholder-user.jpg'; // Иначе используем заглушку

    return (
		<>
		<TopNav params={{ id: params.params.id }} />
		
		{isEditProfileOpen && <EditProfileOverlay />}

		<div className="flex justify-between mx-auto w-full px-5 mt-[90px]">
				<div className="flex justify-end w-full max-w-[1200px] mx-auto">
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
								<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-4">
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
									<div className="flex flex-col items-center justify-center min-h-[400px] text-center">
										<BsPeople className="w-16 h-16 text-[#20DDBB]/30 mb-4" />
										<p className="text-white text-lg mb-2">Friends feature coming soon</p>
										<p className="text-gray-400">Stay tuned for updates</p>
									</div>
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
								{children}
							</motion.div>
						)}
					</AnimatePresence>
				</div>
            </div>

            <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                className="fixed bottom-0 left-0 right-0 bg-[#24183D]/95 backdrop-blur-xl border-t border-white/5"
            >
                <div className="max-w-screen-xl mx-auto">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <motion.div 
                                whileHover={{ scale: 1.05 }}
                                className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-[#20DDBB]/30 
                                         group transition-all duration-300 hover:ring-[#20DDBB]/50
                                         shadow-[0_0_15px_rgba(32,221,187,0.15)]"
                            >
                            <img 
                                src={profileImage}
                                alt={currentProfile?.name || 'Profile'} 
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                            </motion.div>
                            <div className="flex flex-col">
                                <motion.h1 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-lg font-bold text-white"
                                >
                                    {currentProfile?.name || 'User Name'}
                                </motion.h1>
                                {contextUser?.user?.id && currentProfile?.user_id && 
                                contextUser.user.id === currentProfile.user_id && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsEditProfileOpen(true)}
                                        className="flex items-center gap-1 text-sm text-[#20DDBB]/80 hover:text-[#20DDBB] transition-colors"
                                    >
                                        <IoSettingsOutline size={14} />
                                        <span className="hidden sm:inline">Edit Profile</span>
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
                                    toggleShowPurchases();
                                }}
                                className={`group flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 ${
                                    !showFriends && !showLikedTracks && !showPurchases
                                    ? 'text-[#20DDBB] bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 shadow-[0_0_15px_rgba(32,221,187,0.1)]' 
                                    : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-[#20DDBB]/5 hover:to-[#5D59FF]/5 hover:shadow-[0_0_10px_rgba(32,221,187,0.05)]'
                                }`}
                            >
                                <div className={`relative flex items-center justify-center w-7 h-7 rounded-full overflow-hidden ${!showFriends && !showLikedTracks && !showPurchases ? 'bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] shadow-[0_0_10px_rgba(32,221,187,0.5)]' : 'bg-white/10 group-hover:bg-gradient-to-r group-hover:from-[#20DDBB]/50 group-hover:to-[#5D59FF]/50 group-hover:shadow-[0_0_8px_rgba(32,221,187,0.3)]'} transition-all duration-300`}>
                                    <motion.div 
                                        className="absolute inset-0 rounded-full bg-gradient-to-r from-[#20DDBB]/30 to-[#5D59FF]/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        animate={{ 
                                            rotate: !showFriends && !showLikedTracks && !showPurchases ? [0, 360] : [0, 0],
                                        }}
                                        transition={{ 
                                            repeat: Infinity, 
                                            repeatDelay: 3,
                                            duration: 8,
                                            ease: "linear"
                                        }}
                                    />
                                    <BsVinylFill 
                                        className={`w-3.5 h-3.5 transition-all duration-300 ${!showFriends && !showLikedTracks && !showPurchases ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} 
                                    />
                                </div>
                                <span className={`hidden sm:inline font-medium ${!showFriends && !showLikedTracks && !showPurchases ? 'bg-clip-text text-transparent bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] drop-shadow-[0_0_1px_rgba(32,221,187,0.3)]' : 'group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-[#20DDBB]/70 group-hover:to-[#5D59FF]/70'} transition-all duration-300`}>Releases</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setShowFriends(true);
                                    setShowLikedTracks(false);
                                    toggleShowPurchases();
                                }}
                                className={`group flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 ${
                                    showFriends 
                                    ? 'text-[#20DDBB] bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 shadow-[0_0_15px_rgba(32,221,187,0.1)]' 
                                    : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-[#20DDBB]/5 hover:to-[#5D59FF]/5 hover:shadow-[0_0_10px_rgba(32,221,187,0.05)]'
                                }`}
                            >
                                <BsPeople className={`w-5 h-5 transition-all duration-300 ${showFriends ? 'text-[#20DDBB]' : 'text-gray-300 group-hover:text-white'}`} />
                                <span className={`hidden sm:inline font-medium ${showFriends ? 'bg-clip-text text-transparent bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] drop-shadow-[0_0_1px_rgba(32,221,187,0.3)]' : 'group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-[#20DDBB]/70 group-hover:to-[#5D59FF]/70'} transition-all duration-300`}>Friends</span>
                            </motion.button>

                            {isProfileOwner && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        toggleShowPurchases();
                                        setShowLikedTracks(false);
                                        setShowFriends(false);
                                    }}
                                    className={`group flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 ${
                                        showPurchases 
                                        ? 'text-[#20DDBB] bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 shadow-[0_0_15px_rgba(32,221,187,0.1)]' 
                                        : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-[#20DDBB]/5 hover:to-[#5D59FF]/5 hover:shadow-[0_0_10px_rgba(32,221,187,0.05)]'
                                    }`}
                                >
                                    <RiDownloadLine className={`w-5 h-5 transition-all duration-300 ${showPurchases ? 'text-[#20DDBB]' : 'text-gray-300 group-hover:text-white'}`} />
                                    <span className={`hidden sm:inline font-medium ${showPurchases ? 'bg-clip-text text-transparent bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] drop-shadow-[0_0_1px_rgba(32,221,187,0.3)]' : 'group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-[#20DDBB]/70 group-hover:to-[#5D59FF]/70'} transition-all duration-300`}>Purchased</span>
                                </motion.button>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setShowLikedTracks(true);
                                    setShowFriends(false);
                                    toggleShowPurchases();
                                }}
                                className={`group flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 ${
                                    showLikedTracks 
                                    ? 'text-[#20DDBB] bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 shadow-[0_0_15px_rgba(32,221,187,0.1)]' 
                                    : 'text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-[#20DDBB]/5 hover:to-[#5D59FF]/5 hover:shadow-[0_0_10px_rgba(32,221,187,0.05)]'
                                }`}
                            >
                                <BsHeart className={`w-5 h-5 transition-all duration-300 ${showLikedTracks ? 'text-[#20DDBB]' : 'text-gray-300 group-hover:text-white'}`} />
                                <span className={`hidden sm:inline font-medium ${showLikedTracks ? 'bg-clip-text text-transparent bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] drop-shadow-[0_0_1px_rgba(32,221,187,0.3)]' : 'group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-[#20DDBB]/70 group-hover:to-[#5D59FF]/70'} transition-all duration-300`}>Liked</span>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="h-24" />
	</>
    )
}


