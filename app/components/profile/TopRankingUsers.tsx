"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl';
import Link from 'next/link';
import Image from 'next/image';
import { useFriendsStore } from '@/app/stores/friends';
import { useProfileStore } from '@/app/stores/profile';
import { MdLeaderboard } from 'react-icons/md';
import { FaCrown, FaStar, FaMedal } from 'react-icons/fa6';

interface RankedUser {
    id: string;
    user_id: string;
    name: string;
    image?: string;
    username?: string;
    score: number;
    rank: string;
    color: string;
}

const TopRankingUsers: React.FC = () => {
    const [users, setUsers] = useState<RankedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { getAllProfiles } = useProfileStore();
    const { friends, loadFriends } = useFriendsStore();
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Load friends first
                await loadFriends();
                
                // Get all profiles
                const allUsers = await getAllProfiles(1); // Passing 1 as the page parameter
                
                // Create an object to count friends for each user
                const friendsCount: Record<string, number> = {};
                friends.forEach(friendship => {
                    // Count both participants in the friendship
                    friendsCount[friendship.userId] = (friendsCount[friendship.userId] || 0) + 1;
                    friendsCount[friendship.friendId] = (friendsCount[friendship.friendId] || 0) + 1;
                });
                
                // Calculate score based on friends and stats
                const rankedUsers = allUsers.map(user => {
                    // Calculate score based on friends and stats
                    const friendsScore = (friendsCount[user.user_id] || 0) * 10;
                    const likesScore = (user.stats?.totalLikes || 0) * 5;
                    const followersScore = (user.stats?.totalFollowers || 0) * 15;
                    
                    const totalScore = friendsScore + likesScore + followersScore;
                    
                    // Determine rank based on score
                    let rank: string;
                    let color: string;
                    
                    if (totalScore >= 500) {
                        rank = 'Diamond';
                        color = 'text-blue-400';
                    } else if (totalScore >= 300) {
                        rank = 'Platinum';
                        color = 'text-purple-400';
                    } else if (totalScore >= 150) {
                        rank = 'Gold';
                        color = 'text-yellow-500';
                    } else if (totalScore >= 50) {
                        rank = 'Silver';
                        color = 'text-gray-400';
                    } else {
                        rank = 'Bronze';
                        color = 'text-amber-700';
                    }
                    
                    return {
                        id: user.$id,
                        user_id: user.user_id,
                        name: user.name,
                        image: user.image,
                        username: user.name, // Use name as username if not available
                        score: totalScore,
                        rank,
                        color
                    };
                });
                
                // Сортируем по убыванию рейтинга и берем топ-10
                const topUsers = rankedUsers
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10);
                
                setUsers(topUsers);
            } catch (error) {
                console.error('Failed to fetch top users:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchData();
    }, []);
    
    const getRankIcon = (index: number) => {
        switch (index) {
            case 0:
                return <FaCrown className="text-yellow-500" />;
            case 1:
                return <FaStar className="text-gray-300" />;
            case 2:
                return <FaMedal className="text-amber-600" />;
            default:
                return <span className="text-gray-400">{index + 1}</span>;
        }
    };
    
    return (
        <div className="bg-gradient-to-br from-[#252840] to-[#1E2136] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MdLeaderboard className="text-[#20DDBB]" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#20DDBB] to-[#5D59FF]">
                        Top Users
                    </span>
                </h2>
            </div>
            
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 rounded-xl bg-[#1A1C2E]/30 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {users.map((user, index) => (
                        <Link href={`/profile/${user.user_id}`} key={user.id} passHref>
                            <motion.div 
                                className="flex items-center p-3 rounded-xl bg-[#1A1C2E]/50 hover:bg-[#1A1C2E] transition-all duration-300 cursor-pointer"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ x: 5 }}
                            >
                                <div className="flex items-center justify-center w-8 h-8">
                                    {getRankIcon(index)}
                                </div>
                                
                                <div className="relative h-10 w-10 rounded-full overflow-hidden ml-2 mr-3 ring-2 ring-[#20DDBB]/20">
                                    <Image
                                        src={user.image ? useCreateBucketUrl(user.image, 'user') : '/images/placeholders/user-placeholder.svg'}
                                        alt={user.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-white truncate">{user.name}</h4>
                                    {user.username && (
                                        <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <motion.div 
                                        className={`h-7 w-7 rounded-full flex items-center justify-center bg-gradient-to-r ${user.color}`}
                                        whileHover={{ scale: 1.1 }}
                                    >
                                        <span className="text-white text-xs font-bold">{user.score}</span>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TopRankingUsers; 