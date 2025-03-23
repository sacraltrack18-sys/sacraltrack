import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/app/context/user";
import { useFriendStore } from "@/app/stores/friendStore";
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { motion, AnimatePresence } from "framer-motion";
import { BsPersonPlus, BsPersonCheck, BsPersonX } from "react-icons/bs";
import { IoMdMusicalNotes } from "react-icons/io";
import { FaUserFriends } from "react-icons/fa";
import { toast } from "react-hot-toast";

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
    >
      <Link href={`/profile/${profile.user_id}`}>
        <div className="relative w-full h-[200px] overflow-hidden">
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
            <span className="text-[#20DDBB]">Released:</span>
            <span>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Recently'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#20DDBB]">Genre:</span>
            <span>{profile.genre || 'Various'}</span>
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
    </motion.div>
  );
};

export default EnhancedUserProfileCard; 