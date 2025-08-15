"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, FaceSmileIcon, PaperAirplaneIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import Image from "next/image";
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { MUSIC_EMOJIS } from "@/app/hooks/useVibeComments";
import { format } from "date-fns";

interface VibeComment {
  id: string;
  user_id: string;
  vibe_id: string;
  text: string;
  created_at: string;
  profile?: {
    user_id: string;
    name: string;
    image: string;
    username?: string;
  };
  isOptimistic?: boolean;
}

interface QuickCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  vibeId: string;
  isSubmitting?: boolean;
  comments?: VibeComment[];
}

const QuickCommentModal: React.FC<QuickCommentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  vibeId,
  isSubmitting = false,
  comments = [],
}) => {
  const { user } = useUser() || { user: null };
  const { setIsLoginOpen } = useGeneralStore();
  const [commentText, setCommentText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [localComments, setLocalComments] = useState<VibeComment[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local comments when props change
  useEffect(() => {
    setLocalComments([...comments].reverse()); // All comments, newest first
  }, [comments]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCommentText("");
      setShowEmojiPicker(false);
    }
  }, [isOpen]);

  // Handle escape key for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setIsLoginOpen(true);
      return;
    }

    const trimmedComment = commentText.trim();
    if (!trimmedComment) return;

    try {
      // Create optimistic comment for immediate display
      const optimisticComment: VibeComment = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        vibe_id: vibeId,
        text: trimmedComment,
        created_at: new Date().toISOString(),
        profile: {
          user_id: user.id,
          name: user.name || "You",
          image: user.image || "/images/placeholders/user-placeholder.svg",
          username: undefined,
        },
        isOptimistic: true,
      };

      // Add to local comments immediately
      setLocalComments(prev => [optimisticComment, ...prev]);
      
      setCommentText("");
      await onSubmit(trimmedComment);
    } catch (error) {
      console.error("Error submitting comment:", error);
      // Remove optimistic comment on error
      setLocalComments(prev => prev.filter(c => !c.isOptimistic));
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Add emoji to comment
  const addEmoji = (emoji: string) => {
    setCommentText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!onDelete) return;
    
    try {
      await onDelete(commentId);
      setLocalComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  // Get user profile image
  const getUserImage = (imageUrl?: string) => {
    if (imageUrl) {
      return createBucketUrl(imageUrl);
    }
    return "/images/placeholders/user-placeholder.svg";
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return "now";
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
      return format(date, "MMM d");
    } catch {
      return "now";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full Screen Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          />

          {/* Centered Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-2 sm:inset-4 md:inset-8 lg:inset-16 z-50 flex items-center justify-center"
            onClick={(e) => {
              // Only close if clicking on the modal container itself, not its children
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
          >
            {/* Modal Content */}
            <div 
              className="w-full max-w-2xl lg:max-w-4xl h-full max-h-[85vh] sm:max-h-[90vh] bg-gradient-to-br from-[#24183d]/98 to-[#1E1432]/98 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top-right close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 hover:border-white/40 transition-all duration-200 text-white hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
              {/* Header */}
              <div className="p-4 border-b border-white/10 bg-black/20">
                <div>
                  <h3 className="text-xl font-bold text-white">Share your thoughts about this vibe</h3>
                  <p className="text-sm text-gray-400 mt-1">Join the conversation</p>
                </div>
              </div>

              {/* Comments Section */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {localComments.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      All Comments ({localComments.length})
                    </h4>
                    {localComments.map((comment) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${
                          comment.isOptimistic 
                            ? "bg-[#20DDBB]/10 border-[#20DDBB]/30" 
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <Image
                          src={getUserImage(comment.profile?.image)}
                          alt={comment.profile?.name || "User"}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover border border-white/20"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-white truncate">
                              {comment.profile?.name || "Unknown User"}
                            </p>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(comment.created_at)}
                            </span>
                            {comment.isOptimistic && (
                              <span className="text-xs text-[#20DDBB] bg-[#20DDBB]/20 px-2 py-0.5 rounded-full">
                                sending...
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-300 break-words">{comment.text}</p>
                        </div>
                        {/* Delete button for user's own comments */}
                        {user?.id === comment.user_id && !comment.isOptimistic && onDelete && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1.5 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                {localComments.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaceSmileIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-400 text-lg">No comments yet</p>
                      <p className="text-gray-500 text-sm">Be the first to share your thoughts!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Section - Fixed at bottom */}
              <div className="border-t border-white/10 bg-black/20 p-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* User info */}
                  {user && (
                    <div className="flex items-center gap-3">
                      <Image
                        src={getUserImage(user.image)}
                        alt="Your profile"
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border border-white/20"
                      />
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-gray-400 text-sm">Share your vibe...</p>
                      </div>
                    </div>
                  )}

                  {/* Input area */}
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={commentText}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setCommentText(e.target.value);
                        }
                      }}
                      onKeyDown={handleKeyPress}
                      placeholder="What do you think about this vibe? Share your thoughts..."
                      className="w-full bg-white/10 text-white placeholder-gray-400 rounded-xl py-4 px-4 pr-20 focus:outline-none focus:ring-2 focus:ring-[#20DDBB] border border-white/20 transition-all duration-300 hover:border-white/30 focus:border-[#20DDBB]/50 text-base"
                      disabled={isSubmitting}
                    />

                    {/* Emoji button */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`absolute right-14 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors ${
                        showEmojiPicker 
                          ? "bg-[#20DDBB]/20 text-[#20DDBB]" 
                          : "hover:bg-white/10 text-gray-400 hover:text-[#20DDBB]"
                      }`}
                      disabled={isSubmitting}
                    >
                      <FaceSmileIcon className="w-5 h-5" />
                    </button>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isSubmitting}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-[#20DDBB] hover:bg-[#20DDBB]/80 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <PaperAirplaneIcon className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>

                  {/* Emoji picker */}
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="bg-white/10 rounded-xl p-4 border border-white/20 backdrop-blur-sm"
                      >
                        <div className="grid grid-cols-10 gap-2">
                          {MUSIC_EMOJIS.map((emoji, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => addEmoji(emoji)}
                              className="text-2xl p-3 rounded-lg hover:bg-white/20 transition-colors transform hover:scale-110 active:scale-95"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Footer hint */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Press Enter to send • Esc to close</span>
                    <span className={commentText.length > 450 ? "text-orange-400" : ""}>{commentText.length}/500</span>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickCommentModal;
