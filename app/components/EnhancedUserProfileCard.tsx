import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/app/context/user";
import { useFriendStore } from "@/app/stores/friendStore";
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { motion, AnimatePresence } from "framer-motion";
import { BsPersonPlus, BsPersonCheck, BsPersonX } from "react-icons/bs";
import { IoMdMusicalNotes } from "react-icons/io";
import { FaUserFriends, FaInstagram } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useFriendsStore } from "@/app/stores/friends";
import { usePostStore } from "@/app/stores/post";
import { useLikedStore } from "@/app/stores/likedStore";

interface Profile {
  user_id: string;
  name: string;
  image: string;
  created_at?: string;
  genre?: string;
  bio?: string;
}

interface EnhancedUserProfileCardProps {
  profile: Profile;
}

const EnhancedUserProfileCard: React.FC<EnhancedUserProfileCardProps> = ({ profile }) => {
  const contextUser = useUser();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const { friends, pendingRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriendStore();
  
  // Get the profile image URL (handle both undefined and empty string cases)
  const userProfileImageUrl = profile.image && profile.image.trim() 
    ? createBucketUrl(profile.image, 'user') 
    : '/images/placeholders/user-placeholder.svg';
  
  const isFriend = friends.some(friend => friend.friend_id === profile.user_id);
  const pendingRequest = pendingRequests.find(
    req => req.friend_id === profile.user_id || req.user_id === profile.user_id
  );

  useEffect(() => {
    // Get friend count for this user
    const userFriends = friends.filter(friend => friend.friend_id === profile.user_id);
    setFriendCount(userFriends.length);
  }, [friends, profile.user_id]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleHoverStart = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleHoverEnd = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleFriendAction = async () => {
    if (!contextUser?.user) {
      toast.error("Please log in to add friends");
      return;
    }

    try {
      setIsLoading(true);
      if (isFriend) {
        await removeFriend(profile.user_id);
      } else if (pendingRequest) {
        if (pendingRequest.user_id === contextUser.user.id) {
          await rejectFriendRequest(pendingRequest.id);
        } else {
          await acceptFriendRequest(pendingRequest.id);
        }
      } else {
        await sendFriendRequest(contextUser.user.id, profile.user_id);
      }
    } catch (error) {
      console.error('Error handling friend action:', error);
      toast.error('Failed to process friend request');
    } finally {
      setIsLoading(false);
    }
  };

  // Расчет рейтинга
  const { friends: friendsList } = useFriendsStore();
  const { postsByUser: tracks } = usePostStore();
  const { likedPosts: likes } = useLikedStore();
  const [rank, setRank] = useState({ name: 'Novice', color: 'from-gray-400 to-gray-500', score: 0 });
  
  useEffect(() => {
    // Расчет простого рейтинга на основе количества друзей, треков и лайков
    const friendsScore = friendsList.length * 10;
    const tracksScore = tracks?.length * 15 || 0;
    const likesScore = likes?.length * 5 || 0;
    
    const totalScore = friendsScore + tracksScore + likesScore;
    
    // Определение ранга на основе общего счета
    let rankName = 'Novice';
    let color = 'from-gray-400 to-gray-500';
    
    if (totalScore >= 500) {
      rankName = 'Legend';
      color = 'from-purple-400 to-pink-500';
    } else if (totalScore >= 300) {
      rankName = 'Master';
      color = 'from-blue-400 to-purple-500';
    } else if (totalScore >= 150) {
      rankName = 'Advanced';
      color = 'from-cyan-400 to-blue-500';
    } else if (totalScore >= 50) {
      rankName = 'Experienced';
      color = 'from-green-400 to-teal-500';
    }
    
    setRank({ name: rankName, color, score: totalScore });
  }, [friendsList.length, tracks, likes]);

  const getFriendActionButton = () => {
    if (contextUser?.user?.id === profile.user_id) return null;

    const buttonClasses = "absolute top-2 right-2 p-2 rounded-xl transition-all duration-200 flex items-center gap-2";
    const iconClasses = "text-xl";

    if (isLoading) {
      return (
        <div className={`${buttonClasses} bg-[#2E2469] cursor-not-allowed`}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className={`${iconClasses} text-[#20DDBB]`}
          >
            ⟳
          </motion.div>
        </div>
      );
    }

    if (isFriend) {
      return (
        <button
          onClick={handleFriendAction}
          className={`${buttonClasses} bg-[#2E2469] hover:bg-[#1f1847] group`}
          title="Remove friend"
        >
          <BsPersonCheck className={`${iconClasses} text-[#20DDBB] group-hover:scale-110 transition-transform`} />
        </button>
      );
    }

    if (pendingRequest) {
      const isPending = pendingRequest.user_id === contextUser?.user?.id;
      return (
        <button
          onClick={handleFriendAction}
          className={`${buttonClasses} bg-[#2E2469] hover:bg-[#1f1847] group`}
          title={isPending ? "Cancel request" : "Accept request"}
        >
          <BsPersonX className={`${iconClasses} text-yellow-400 group-hover:scale-110 transition-transform`} />
        </button>
      );
    }

    return (
      <button
        onClick={handleFriendAction}
        className={`${buttonClasses} bg-[#2E2469] hover:bg-[#1f1847] group`}
        title="Add friend"
      >
        <BsPersonPlus className={`${iconClasses} text-white group-hover:scale-110 transition-transform`} />
      </button>
    );
  };

  return (
    <motion.div
      className="relative w-full h-[350px] rounded-2xl overflow-hidden bg-[#1E2136] shadow-lg hover:shadow-2xl transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      style={{ 
        transformOrigin: 'center bottom',
        willChange: 'transform, opacity'
      }}
    >
      <Link href={`/profile/${profile.user_id}`}>
        <div className="relative w-full h-[200px] overflow-hidden">
          {/* Добавляем рейтинг на изображение профиля */}
          <motion.div 
            className="absolute top-3 left-3 z-20 glass-rating px-2 py-1 rounded-full flex items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div 
              className={`h-5 w-5 rounded-full flex items-center justify-center bg-gradient-to-r ${rank.color} text-xs font-bold`}
              animate={{ 
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                repeatType: "reverse"
              }}
            >
              {rank.score}
            </motion.div>
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${rank.color} text-xs font-bold`}>
              {rank.name}
            </span>
          </motion.div>
          
          <motion.img
            src={imageError ? '/images/placeholders/user-placeholder.svg' : userProfileImageUrl}
            alt={profile.name}
            className="w-full h-full object-cover"
            onError={handleImageError}
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.3 }}
          />
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center"
              >
                <span className="text-white text-lg font-medium px-6 py-2 rounded-full bg-[#20DDBB]/20 backdrop-blur-sm">
                  View Profile
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>

      {getFriendActionButton()}

      <div className="p-4">
        <h3 className="text-xl font-semibold text-white mb-2 truncate">{profile.name}</h3>
        
        <div className="flex items-center justify-between text-[#818BAC] text-sm mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[#20DDBB]">Label</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#20DDBB]">Ambient</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link 
            href={`/profile/${profile.user_id}`}
            className="flex items-center gap-2 text-[#818BAC] hover:text-[#20DDBB] transition-colors group"
          >
            <IoMdMusicalNotes className="text-xl group-hover:scale-110 transition-transform" />
            <span>View Tracks</span>
          </Link>
          <div className="flex items-center gap-2 text-[#818BAC]">
            <FaUserFriends className="text-xl" />
            <span>{friendCount} friends</span>
          </div>
        </div>

        {/* Социальные иконки без заголовка */}
        <div className="flex mt-3 gap-2 justify-center">
          <Link href="#" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all duration-300">
            <FaInstagram className="text-[#20DDBB]" />
          </Link>
          {/* Здесь можно добавить другие социальные иконки при необходимости */}
        </div>

        {profile.bio && (
          <motion.p 
            className="mt-3 text-[#818BAC] text-sm line-clamp-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {profile.bio}
          </motion.p>
        )}
      </div>
      
      <style jsx global>{`
        .glass-rating {
          background: rgba(26, 30, 54, 0.7);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 10px rgba(32, 221, 187, 0.2);
        }
      `}</style>
    </motion.div>
  );
};

export default EnhancedUserProfileCard;