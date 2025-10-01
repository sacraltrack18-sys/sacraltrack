"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/app/context/user';
import { useFriendsStore } from '@/app/stores/friends';
import Image from 'next/image';
import { database, Query } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FaSearch, FaUserPlus, FaCheckCircle, FaUserFriends } from 'react-icons/fa';
import { BsPersonCircle, BsPersonPlusFill, BsCheck2, BsCheck2All } from 'react-icons/bs';
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl';

interface Profile {
    $id: string;
    user_id: string;
    name: string;
    image?: string;
    username?: string;
    bio?: string;
}

interface SearchFriendsModalProps {
    onClose: () => void;
    onAddFriend: (userId: string) => Promise<void>;
    currentUserId: string;
}

export default function SearchFriendsModal({ onClose, onAddFriend, currentUserId }: SearchFriendsModalProps) {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [addingFriend, setAddingFriend] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    
    const { friends, sentRequests, loadFriends, loadSentRequests } = useFriendsStore();
    
    // Load user profiles
    useEffect(() => {
        const fetchProfiles = async () => {
            if (!currentUserId) return;
            
            setIsLoading(true);
            try {
                // Load friends and sent requests for proper status display
                await Promise.all([loadFriends(), loadSentRequests()]);
                
                // Load all user profiles from the database
                const response = await database.listDocuments(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                    [Query.limit(100)]
                );
                
                // Filter to not show the current user
                const filteredProfiles = response.documents.filter(
                    profile => profile.user_id !== currentUserId
                ) as unknown as Profile[];
                
                setProfiles(filteredProfiles);
                setFilteredProfiles(filteredProfiles);
            } catch (error) {
                console.error("Failed to load profiles:", error);
                toast.error("Failed to load users");
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchProfiles();
    }, [currentUserId, loadFriends, loadSentRequests]);
    
    // Handle search query changes
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredProfiles(profiles);
            return;
        }
        
        const query = searchQuery.toLowerCase();
        const filtered = profiles.filter(profile => 
            profile.name.toLowerCase().includes(query) || 
            (profile.username && profile.username.toLowerCase().includes(query))
        );
        
        setFilteredProfiles(filtered);
    }, [searchQuery, profiles]);
    
    // Check if user is a friend or if a request has been sent
    const checkFriendStatus = (userId: string) => {
        const isFriend = friends.some(friend => friend.friendId === userId);
        const isRequestSent = sentRequests.some(request => request.friendId === userId);
        
        if (isFriend) return 'friend';
        if (isRequestSent) return 'requested';
        return 'none';
    };
    
    // Handle click outside the modal to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);
    
    // Handle sending a friend request
    const handleAddFriend = async (userId: string) => {
        if (!currentUserId) {
            toast.error('You need to be logged in to add friends');
            return;
        }
        
        try {
            setAddingFriend(userId);
            await onAddFriend(userId);
            // Update friends and requests lists after successful addition
            await Promise.all([loadFriends(), loadSentRequests()]);
        } catch (error) {
            console.error("Failed to add friend:", error);
            toast.error('Failed to send friend request. Please try again.');
        } finally {
            setAddingFriend(null);
        }
    };
    
    // Empty state component
    const EmptyState = () => (
        <motion.div 
            className="flex flex-col items-center justify-center py-12 px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
        >
            <motion.div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-[#24183D]/50 to-[#20DDBB]/20 flex items-center justify-center mb-4"
                animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, 0, -5, 0]
                }}
                transition={{ 
                    duration: 5,
                    repeat: Infinity,
                    repeatType: "reverse"
                }}
            >
                <FaSearch className="text-[#20DDBB]/70 text-3xl" />
            </motion.div>
            
            <h3 className="text-xl font-bold text-white mb-2">
                {searchQuery ? 'No Users Found' : 'Start Searching'}
            </h3>
            
            <p className="text-gray-400 max-w-md">
                {searchQuery 
                    ? `We couldn't find any users matching "${searchQuery}". Try different keywords.` 
                    : 'Search for users by their name or username to connect with them.'}
            </p>
        </motion.div>
    );
    
    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <motion.div
                    ref={modalRef}
                    className="bg-gradient-to-br from-[#1E2136] to-[#15162C] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-xl border border-[#20DDBB]/20"
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.5 }}
                >
                    {/* Header with gradient border */}
                    <div className="relative">
                        {/* Gradient border effect */}
                        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#20DDBB]/30 to-transparent" />
                        
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <motion.h2 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[#20DDBB]"
                                >
                                    Find Friends
                                </motion.h2>
                                
                                <motion.button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors duration-200 border border-white/10"
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </motion.button>
                            </div>
                            
                            {/* Search field */}
                            <motion.div 
                                className="relative"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <FaSearch className="w-4 h-4 text-[#20DDBB]" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or username..."
                                    className="w-full pl-12 pr-4 py-3.5 bg-[#252742]/80 text-white rounded-xl border border-[#20DDBB]/20 focus:border-[#20DDBB]/40 focus:outline-none focus:ring-1 focus:ring-[#20DDBB]/30 placeholder-gray-500 transition-all duration-300"
                                />
                            </motion.div>
                        </div>
                    </div>
                    
                    {/* User list */}
                    <div className="overflow-y-auto p-6 pt-2" style={{ maxHeight: 'calc(85vh - 140px)' }}>
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <motion.div 
                                    className="w-12 h-12 rounded-full border-t-2 border-r-2 border-[#20DDBB] border-b-2 border-l-transparent"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            </div>
                        ) : filteredProfiles.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <motion.div 
                                className="grid gap-3"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {filteredProfiles.map((profile, index) => {
                                    const friendStatus = checkFriendStatus(profile.user_id);
                                    const isAdding = addingFriend === profile.user_id;
                                    
                                    return (
                                        <motion.div
                                            key={profile.$id}
                                            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[#252742]/90 to-[#1E2136]/90 hover:from-[#252742] hover:to-[#2A2D42] transition-colors backdrop-blur-sm border border-white/5 relative overflow-hidden group"
                                            whileHover={{ 
                                                scale: 1.02,
                                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" 
                                            }}
                                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ 
                                                opacity: 1, 
                                                y: 0,
                                                transition: { delay: 0.05 * index } 
                                            }}
                                        >
                                            {/* Decorative gradient bars */}
                                            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#20DDBB]/40 via-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            
                                            <div className="flex items-center space-x-4">
                                                <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-[#252742] to-[#1E2136] relative flex-shrink-0 border border-white/10 shadow-md">
                                                    {profile.image ? (
                                                        <Image
                                                            src={useCreateBucketUrl(profile.image, 'user')}
                                                            alt={profile.name}
                                                            fill
                                                            className="object-cover"
                                                            onError={(e) => (e.currentTarget.src = '/images/placeholders/user-placeholder.svg')}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-2xl text-[#20DDBB]/40">
                                                            <BsPersonCircle size={30} />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div>
                                                    <h3 className="font-semibold text-white">{profile.name}</h3>
                                                    {profile.username && (
                                                        <p className="text-sm text-gray-400">@{profile.username}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {friendStatus === 'none' ? (
                                                <motion.button
                                                    onClick={() => handleAddFriend(profile.user_id)}
                                                    disabled={isAdding}
                                                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#20DDBB]/80 to-[#20DDBB]/60 text-[#0F1023] font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70"
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    {isAdding ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-[#0F1023] border-t-transparent rounded-full animate-spin" />
                                                            <span>Sending...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <BsPersonPlusFill className="w-4 h-4" />
                                                            <span>Add Friend</span>
                                                        </>
                                                    )}
                                                </motion.button>
                                            ) : friendStatus === 'requested' ? (
                                                <span className="px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 text-sm font-medium flex items-center gap-2 border border-blue-500/20">
                                                    <BsCheck2 className="w-4 h-4" />
                                                    Request Sent
                                                </span>
                                            ) : (
                                                <span className="px-3 py-2 rounded-xl bg-green-500/10 text-green-400 text-sm font-medium flex items-center gap-2 border border-green-500/20">
                                                    <FaUserFriends className="w-4 h-4" />
                                                    Friends
                                                </span>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
} 