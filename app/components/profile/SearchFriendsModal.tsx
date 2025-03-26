"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/app/context/user';
import { useFriendsStore } from '@/app/stores/friends';
import Image from 'next/image';
import { database, Query } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';
import { XMarkIcon, MagnifyingGlassIcon, UserPlusIcon, CheckIcon } from '@heroicons/react/24/outline';
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
    isOpen: boolean;
    onClose: () => void;
}

export default function SearchFriendsModal({ isOpen, onClose }: SearchFriendsModalProps) {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const modalRef = useRef<HTMLDivElement>(null);
    
    const userContext = useUser();
    const { friends, sentRequests, loadFriends, loadSentRequests, addFriend } = useFriendsStore();
    
    // Load user profiles
    useEffect(() => {
        const fetchProfiles = async () => {
            if (!isOpen) return;
            
            console.log('Fetching profiles, user object:', userContext);
            
            if (!userContext?.user?.id) {
                console.log('No user ID available:', userContext);
                return;
            }
            
            setIsLoading(true);
            try {
                // Load friends and sent requests for proper status display
                await Promise.all([loadFriends(), loadSentRequests()]);
                
                // Load all user profiles from the database
                console.log('Fetching profiles from collection:', process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE);
                const response = await database.listDocuments(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                    [Query.limit(100)]
                );
                
                console.log('Profiles response:', response.documents);
                
                // Filter to not show the current user
                const filteredProfiles = response.documents.filter(
                    profile => profile.user_id !== userContext?.user?.id
                ) as unknown as Profile[];
                
                console.log('Filtered profiles:', filteredProfiles);
                
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
    }, [isOpen, userContext?.user?.id, loadFriends, loadSentRequests]);
    
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
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);
    
    // Handle sending a friend request
    const handleAddFriend = async (userId: string) => {
        console.log('handleAddFriend called for user ID:', userId);
        
        if (!userContext?.user?.id) {
            console.error('Cannot add friend: user not logged in', userContext);
            toast.error('You need to be logged in to add friends');
            return;
        }
        
        try {
            console.log('Calling addFriend with friendId:', userId, 'and currentUserId:', userContext.user.id);
            await addFriend(userId, userContext.user.id);
            
            console.log('Friend request sent successfully, updating UI lists');
            // Update friend and request lists
            await Promise.all([loadFriends(), loadSentRequests()]);
            
            console.log('Friend lists updated');
        } catch (error) {
            console.error("Failed to add friend:", error);
            toast.error('Failed to send friend request. Please try again.');
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <motion.div
                    ref={modalRef}
                    className="bg-gradient-to-br from-[#1E2136] to-[#15162C] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl border border-purple-500/20"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    transition={{ type: "spring", duration: 0.5 }}
                >
                    {/* Header and search */}
                    <div className="p-6 border-b border-purple-900/20">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-white">Find Friends</h2>
                            <motion.button
                                onClick={onClose}
                                className="p-2 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors duration-200"
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </motion.button>
                        </div>
                        
                        {/* Search field */}
                        <motion.div 
                            className="relative"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or username..."
                                className="w-full pl-10 pr-4 py-3 bg-[#252742] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                            />
                        </motion.div>
                    </div>
                    
                    {/* User list */}
                    <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(80vh - 140px)' }}>
                        {isLoading ? (
                            <div className="flex justify-center py-10">
                                <motion.div 
                                    className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            </div>
                        ) : filteredProfiles.length === 0 ? (
                            <motion.div 
                                className="text-center py-10 text-gray-400"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {searchQuery ? 'No users found' : 'No users available'}
                            </motion.div>
                        ) : (
                            <motion.div 
                                className="grid gap-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {filteredProfiles.map((profile, index) => {
                                    const friendStatus = checkFriendStatus(profile.user_id);
                                    
                                    return (
                                        <motion.div
                                            key={profile.$id}
                                            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[#252742] to-[#1E2136] hover:from-[#252742]/90 hover:to-[#2A2D42] transition-colors backdrop-blur-sm border border-white/5"
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
                                            <div className="flex items-center space-x-4">
                                                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-purple-500/20 ring-2 ring-purple-500/20">
                                                    <Image
                                                        src={profile.image ? useCreateBucketUrl(profile.image, 'user') : '/images/placeholders/user-placeholder.svg'}
                                                        alt={profile.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="text-white font-medium">{profile.name}</h3>
                                                    {profile.username && (
                                                        <p className="text-purple-400 text-sm">@{profile.username}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                {friendStatus === 'none' ? (
                                                    <motion.button
                                                        onClick={() => handleAddFriend(profile.user_id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium shadow-lg shadow-purple-900/20 hover:from-purple-600 hover:to-blue-600"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <UserPlusIcon className="w-4 h-4 mr-1" />
                                                        Add
                                                    </motion.button>
                                                ) : friendStatus === 'requested' ? (
                                                    <motion.div 
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-700 text-gray-300 font-medium cursor-default"
                                                        whileHover={{ scale: 1.05 }}
                                                    >
                                                        <CheckIcon className="w-4 h-4 mr-1" />
                                                        Sent
                                                    </motion.div>
                                                ) : (
                                                    <motion.div 
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-600 text-white font-medium cursor-default"
                                                        whileHover={{ scale: 1.05 }}
                                                    >
                                                        <CheckIcon className="w-4 h-4 mr-1" />
                                                        Friend
                                                    </motion.div>
                                                )}
                                            </div>
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