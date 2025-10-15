"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFriendsStore } from "@/app/stores/friends";
import { useUser } from "@/app/context/user";
import {
  BsPeople,
  BsPersonPlus,
  BsCheckLg,
  BsXLg,
  BsPersonDash,
  BsGlobe,
  BsClock,
  BsCalendar,
} from "react-icons/bs";
import {
  FaUserFriends,
  FaUserClock,
  FaPaperPlane,
  FaSearch,
} from "react-icons/fa";
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Image from "next/image";
import SimpleSkeleton from "@/app/components/ui/UnifiedSkeleton";
import { useProfileStore } from "@/app/stores/profile";
import { database } from "@/libs/AppWriteClient";
import SearchFriendsModal from "./SearchFriendsModal";
import { UserPlusIcon } from "@heroicons/react/24/solid";
import { formatDistanceToNow } from "@/app/utils/dateUtils";

interface User {
  id?: string;
  user_id: string;
  name: string;
  image?: string;
  username?: string;
  bio?: string;
}

interface FriendRequest {
  id: string;
  userId: string;
  friendId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  user?: User;
}

const FriendCard: React.FC<{
  user: User;
  isFriend?: boolean;
  requestId?: string;
  isPending?: boolean;
  isSent?: boolean;
  createdAt?: string;
  onAccept?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onRemove?: (userId: string) => void;
}> = ({
  user,
  isFriend = false,
  requestId,
  isPending = false,
  isSent = false,
  createdAt,
  onAccept,
  onReject,
  onRemove,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const formattedDate = createdAt
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
    : "";

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl group cursor-pointer"
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => window.location.href = `/profile/${user.user_id}`}
    >
      {/* Glass morphism background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#24183d]/60 to-[#20113a]/70 backdrop-blur-xl border border-white/10 z-0" />

      {/* Decorative glass elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-full blur-3xl z-0 -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#20DDBB]/5 to-purple-500/5 rounded-full blur-3xl z-0 -ml-16 -mb-16" />

      {/* User background image */}
      <div className="relative w-full h-[300px] overflow-hidden z-10">
        <Image
          src={
            imageError
              ? "/images/placeholders/user-placeholder.png"
              : user.image
                ? useCreateBucketUrl(user.image, "user")
                : "/images/placeholders/user-placeholder.png"
          }
          alt={user.name || "User"}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />

        {/* Glass overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E2136]/80 via-transparent to-[#1E2136]/20 z-10" />

        {/* Hover glass effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 backdrop-blur-[1px] z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.6 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Status badges */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
          {user.username && (
            <motion.div
              className="bg-[#20DDBB]/15 backdrop-blur-md px-3 py-1 rounded-full border border-[#20DDBB]/20"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-xs text-white font-medium">@{user.username}</p>
            </motion.div>
          )}

          {isPending && (
            <motion.div
              className="bg-amber-500/15 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/20"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs text-amber-400 font-medium flex items-center gap-1">
                <BsClock size={10} />
                <span>Pending</span>
              </p>
            </motion.div>
          )}

          {isSent && (
            <motion.div
              className="bg-blue-500/15 backdrop-blur-md px-3 py-1 rounded-full border border-blue-500/20"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs text-blue-400 font-medium flex items-center gap-1">
                <FaPaperPlane size={10} />
                <span>Sent</span>
              </p>
            </motion.div>
          )}

          {isFriend && (
            <motion.div
              className="bg-green-500/15 backdrop-blur-md px-3 py-1 rounded-full border border-green-500/20"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs text-green-400 font-medium flex items-center gap-1">
                <FaUserFriends size={10} />
                <span>Friend</span>
              </p>
            </motion.div>
          )}
        </div>

        {/* Date badge */}
        {createdAt && (
          <motion.div
            className="absolute top-3 right-3 z-20 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-xs text-white/80 font-medium flex items-center gap-1">
              <BsCalendar size={10} />
              {formattedDate}
            </p>
          </motion.div>
        )}
      </div>

      {/* User name overlaid on image */}
      <div className="absolute bottom-4 left-4 z-20">
        <h3 className="text-lg font-bold text-white truncate drop-shadow-lg">
          {user.name}
        </h3>
      </div>

      {/* Action buttons at bottom line */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center space-x-2">
        {isPending && requestId && (
          <>
            <button
              className="p-2 rounded-xl bg-gradient-to-r from-green-500/20 to-teal-500/20 backdrop-blur-md text-green-400 hover:from-green-500/30 hover:to-teal-500/30 transition-all duration-300 border border-green-500/20"
              onClick={(e) => {
                e.stopPropagation();
                onAccept && onAccept(requestId);
              }}
            >
              <BsCheckLg size={18} />
            </button>
            <button
              className="p-2 rounded-xl bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-md text-red-400 hover:from-red-500/30 hover:to-pink-500/30 transition-all duration-300 border border-red-500/20"
              onClick={(e) => {
                e.stopPropagation();
                onReject && onReject(requestId);
              }}
            >
              <BsXLg size={18} />
            </button>
          </>
        )}

        {isFriend && (
          <button
            className="p-2 rounded-xl bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-md text-red-400 hover:from-red-500/30 hover:to-pink-500/30 transition-all duration-300 border border-red-500/20"
            onClick={(e) => {
              e.stopPropagation();
              onRemove && onRemove(user.user_id);
            }}
          >
            <BsPersonDash size={18} />
          </button>
        )}
      </div>

      {/* Subtle glow effect */}
      <motion.div
        className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-2xl z-5 -mr-8 -mt-8"
        animate={{
          scale: isHovered ? [1, 1.1, 1] : 1,
          opacity: isHovered ? [0.2, 0.4, 0.2] : 0.2,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </motion.div>
  );
};

// Enhanced empty state component
const EmptyState: React.FC<{
  message: string;
  icon: React.ReactNode;
  actionButton?: React.ReactNode;
}> = ({ message, icon, actionButton }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center p-12 text-center"
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
      className="w-24 h-24 rounded-full bg-gradient-to-br from-[#24183D]/50 to-[#20DDBB]/20 flex items-center justify-center mb-6"
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, 0, -5, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="text-[#20DDBB]/70 text-5xl"
      >
        {icon}
      </motion.div>
    </motion.div>

    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-gray-400 text-lg mb-6 max-w-md"
    >
      {message}
    </motion.p>

    {actionButton && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {actionButton}
      </motion.div>
    )}
  </motion.div>
);

// Unified loading state
const LoadingState = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <SimpleSkeleton key={i} variant="friend" />
    ))}
  </div>
);

export default function FriendsTab({ profileId }: { profileId: string }) {
  const {
    friends,
    pendingRequests,
    sentRequests,
    loading,
    loadFriends,
    loadPendingRequests,
    loadSentRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    addFriend,
  } = useFriendsStore();

  const { getProfileById, currentProfile } = useProfileStore();

  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "sent">(
    "friends",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const contextUser = useUser();

  // Determine if the current user is the profile owner
  const isOwner = contextUser?.user?.id === profileId;

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Use profileId for the profile being viewed, not the logged-in user
      const userId = profileId;

      // If viewing own profile, load all lists
      if (isOwner) {
        await Promise.all([
          loadFriends(userId),
          loadPendingRequests(contextUser?.user?.id), // Only logged-in user can see their pending requests
          loadSentRequests(contextUser?.user?.id), // Only logged-in user can see their sent requests
        ]);
      } else {
        // If viewing another profile, only load friends list
        await loadFriends(userId);
      }
    } catch (error) {
      console.error("Error fetching friends data:", error);
      toast.error("Failed to load friends data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isOwner, profileId]);

  // Friend action handlers
  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      toast.success("Friend request accepted");
      fetchData(); // Refresh data after action
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Failed to accept friend request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      toast.success("Friend request rejected");
      fetchData(); // Refresh data after action
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error("Failed to reject friend request");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await removeFriend(friendId);
      toast.success("Friend removed");
      fetchData(); // Refresh data after action
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Failed to remove friend");
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await addFriend(userId, contextUser?.user?.id);
      toast.success("Friend request sent");
      fetchData(); // Refresh data after action
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request");
    }
  };

  // Render and UI
  return (
    <div className="w-full">
      {/* Glass Tabs Panel */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-center gap-2 mb-6 px-3 py-2 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 w-fit mx-auto"
      >
        <TabButton
          isActive={activeTab === "friends"}
          onClick={() => setActiveTab("friends")}
          icon={<FaUserFriends className="w-4 h-4" />}
          label="Friends"
          count={friends.length}
        />
        <TabButton
          isActive={activeTab === "requests"}
          onClick={() => setActiveTab("requests")}
          icon={<FaUserClock className="w-4 h-4" />}
          label="Friend Requests"
          count={pendingRequests.length}
        />
        <TabButton
          isActive={activeTab === "sent"}
          onClick={() => setActiveTab("sent")}
          icon={<FaPaperPlane className="w-4 h-4" />}
          label="Sent Requests"
          count={sentRequests.length}
        />
        {isOwner && (
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#20DDBB]/80 to-[#5D59FF]/80 rounded-xl text-white font-medium shadow-md border border-[#20DDBB]/30 ml-2 text-xs hover:from-[#20DDBB] hover:to-[#5D59FF] transition-all"
          >
            <FaSearch className="w-4 h-4" />
            <span>Find Friends</span>
          </button>
        )}
      </motion.div>

      {/* Tab contents */}
      {isLoading ? (
        <LoadingState />
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === "friends" || !isOwner ? (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {friends.length === 0 ? (
                <EmptyState
                  message={
                    isOwner
                      ? "You don't have any friends yet. Start connecting with other users!"
                      : `${currentProfile?.name} doesn't have any friends yet.`
                  }
                  icon={<FaUserFriends />}
                  actionButton={
                    isOwner && (
                      <button
                        onClick={() => setShowSearchModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/30 text-[#20DDBB] rounded-xl font-medium border border-[#20DDBB]/30 flex items-center gap-2"
                      >
                        <BsPersonPlus size={18} />
                        <span>Find New Friends</span>
                      </button>
                    )
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-[10px] md:px-2">
                  {friends.map((friend) => (
                    <FriendCard
                      key={friend.id}
                      user={{
                        user_id: friend.friendId,
                        name: friend.profile?.name || "User",
                        image: friend.profile?.image,
                        username: friend.profile?.username,
                      }}
                      isFriend={true}
                      createdAt={friend.createdAt}
                      onRemove={isOwner ? handleRemoveFriend : undefined}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === "requests" ? (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {pendingRequests.length === 0 ? (
                <EmptyState
                  message="You don't have any pending friend requests"
                  icon={<FaUserClock />}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-[10px] md:px-2">
                  {pendingRequests.map((request) => (
                    <FriendCard
                      key={request.id}
                      user={{
                        user_id: request.userId,
                        name: request.profile?.name || "User",
                        image: request.profile?.image,
                        username: request.profile?.username,
                      }}
                      isPending={true}
                      requestId={request.id}
                      createdAt={request.createdAt}
                      onAccept={handleAcceptRequest}
                      onReject={handleRejectRequest}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {sentRequests.length === 0 ? (
                <EmptyState
                  message="You haven't sent any friend requests yet"
                  icon={<FaPaperPlane />}
                  actionButton={
                    <motion.button
                      onClick={() => setShowSearchModal(true)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/30 text-[#20DDBB] rounded-xl font-medium border border-[#20DDBB]/30 flex items-center gap-2"
                    >
                      <BsPersonPlus size={18} />
                      <span>Find New Friends</span>
                    </motion.button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-[10px] md:px-2">
                  {sentRequests.map((request) => (
                    <FriendCard
                      key={request.id}
                      user={{
                        user_id: request.friendId,
                        name: request.profile?.name || "User",
                        image: request.profile?.image,
                        username: request.profile?.username,
                      }}
                      isSent={true}
                      createdAt={request.createdAt}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Search friends modal */}
      {showSearchModal && (
        <SearchFriendsModal
          onClose={() => setShowSearchModal(false)}
          onAddFriend={handleAddFriend}
          currentUserId={contextUser?.user?.id || ""}
        />
      )}
    </div>
  );
}

// Tab button component
const TabButton: React.FC<{
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}> = ({ isActive, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors duration-200 ${
      isActive
        ? "text-[#20DDBB] border-b-2 border-[#20DDBB]"
        : "text-gray-400 hover:text-white"
    }`}
  >
    {icon}
    <span>{label}</span>
    {count && count > 0 && (
      <span
        className={`px-2 py-0.5 rounded-full text-xs ${
          isActive
            ? "bg-[#20DDBB]/20 text-[#20DDBB]"
            : "bg-white/10 text-white/70"
        }`}
      >
        {count}
      </span>
    )}
  </button>
);
