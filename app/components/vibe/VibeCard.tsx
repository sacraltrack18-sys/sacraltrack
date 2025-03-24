"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useVibeStore, VibePostWithProfile } from '@/app/stores/vibeStore';
import { useUser } from '@/app/context/user';
import { useVibeComments } from '@/app/hooks/useVibeComments';
import { 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  ShareIcon, 
  EllipsisHorizontalIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import useDeviceDetect from '@/app/hooks/useDeviceDetect';
import toast from 'react-hot-toast';
import { useGeneralStore } from '@/app/stores/general';

interface VibeCardProps {
  vibe: VibePostWithProfile;
  onLike?: (vibeId: string) => void;
  onUnlike?: (vibeId: string) => void;
}

export const VibeCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-[#1E2136] to-[#252742] rounded-xl overflow-hidden shadow-lg border border-purple-900/10 animate-pulse"
    >
      <div className="p-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gray-700 animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 w-16 bg-gray-700 rounded mt-1 animate-pulse"></div>
          </div>
        </div>
        <div className="mt-3 h-4 w-3/4 bg-gray-700 rounded animate-pulse"></div>
      </div>
      <div className="aspect-square rounded-lg mx-4 bg-gray-800 animate-pulse"></div>
      <div className="p-4">
        <div className="flex justify-between mt-2">
          <div className="flex space-x-4">
            <div className="h-6 w-6 bg-gray-700 rounded-full animate-pulse"></div>
            <div className="h-6 w-6 bg-gray-700 rounded-full animate-pulse"></div>
          </div>
          <div className="h-6 w-6 bg-gray-700 rounded-full animate-pulse"></div>
        </div>
        <div className="h-4 w-24 bg-gray-700 rounded mt-3 animate-pulse"></div>
        <div className="h-3 w-full bg-gray-700 rounded mt-2 animate-pulse"></div>
        <div className="h-3 w-1/2 bg-gray-700 rounded mt-1 animate-pulse"></div>
      </div>
    </motion.div>
  );
};

const VibeCard: React.FC<VibeCardProps> = ({ vibe, onLike, onUnlike }) => {
  const { user } = useUser() || { user: null };
  const { isMobile } = useDeviceDetect();
  const { userLikedVibes, checkIfUserLikedVibe, likeVibe, unlikeVibe } = useVibeStore();
  const { setIsLoginOpen } = useGeneralStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(vibe.stats?.total_likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  
  const { comments, fetchComments, addComment, isLoading: commentsLoading } = useVibeComments(vibe.id);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (user?.id && vibe.id) {
        try {
          const hasLiked = await checkIfUserLikedVibe(vibe.id, user.id);
          setIsLiked(hasLiked);
        } catch (error) {
          console.error('Error checking like status:', error);
        }
      } else {
        setIsLiked(false);
      }
    };

    checkLikeStatus();
    
    // Simulate image loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [user?.id, vibe.id, checkIfUserLikedVibe, userLikedVibes]);

  const handleLikeToggle = async () => {
    if (!user?.id) {
      setIsLoginOpen(true);
      return;
    }

    try {
      if (isLiked) {
        await unlikeVibe(vibe.id, user.id);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        if (onUnlike) onUnlike(vibe.id);
      } else {
        await likeVibe(vibe.id, user.id);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        if (onLike) onLike(vibe.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleOpenComments = async () => {
    await fetchComments();
    setShowComments(true);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim()) return;
    if (!user?.id) {
      setIsLoginOpen(true);
      return;
    }

    try {
      await addComment(commentText);
      setCommentText('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleShare = () => {
    if (navigator.share && isMobile) {
      navigator.share({
        title: `${vibe.profile?.name}'s Vibe`,
        text: vibe.caption || 'Check out this vibe!',
        url: `${window.location.origin}/vibe/${vibe.id}`
      }).catch(error => {
        console.error('Error sharing:', error);
      });
    } else {
      // Copy to clipboard for desktop
      navigator.clipboard.writeText(`${window.location.origin}/vibe/${vibe.id}`);
      toast.success('Link copied to clipboard');
    }
  };

  // Render specific content based on vibe type
  const renderVibeContent = () => {
    switch (vibe.type) {
      case 'photo':
        return (
          <div className="relative aspect-square rounded-lg overflow-hidden group">
            {isLoading && (
              <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center text-gray-500">
                <svg className="w-12 h-12 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            <Image
              src={imageError ? '/images/placeholders/image-placeholder.png' : vibe.media_url}
              alt={vibe.caption || 'Vibe photo'}
              fill
              className={`object-cover transition-all duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              onError={() => setImageError(true)}
              onLoad={() => setIsLoading(false)}
            />
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Mood indicator if available */}
            {vibe.mood && (
              <div className="absolute top-3 right-3 bg-purple-600/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                {vibe.mood}
              </div>
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
            <div className="text-white text-center p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-purple-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Video Vibe Coming Soon</p>
            </div>
          </div>
        );
      
      case 'sticker':
        return (
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
            <div className="text-white text-center p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-pink-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">Sticker Vibe Coming Soon</p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="bg-gray-800 text-white p-4 rounded-lg text-center">
            Unknown Vibe Type
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-[#1E2136] to-[#252742] rounded-xl overflow-hidden shadow-lg border border-purple-900/10 relative"
    >
      {/* Header with user info */}
      <div className="p-4">
        <div className="flex items-center space-x-3">
          <Link href={`/profile/${vibe.user_id}`}>
            <div className="relative h-10 w-10">
              <Image
                src={vibe.profile?.image || '/images/placeholders/user-placeholder.svg'}
                alt={vibe.profile?.name || 'User'}
                fill
                className="rounded-full object-cover border-2 border-purple-500/30"
              />
            </div>
          </Link>
          <div className="flex-1">
            <Link href={`/profile/${vibe.user_id}`}>
              <h3 className="font-semibold text-white hover:text-purple-400 transition-colors">
                {vibe.profile?.name || 'Unknown User'}
              </h3>
            </Link>
            <p className="text-xs text-gray-400">
              {new Date(vibe.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          {/* Options menu */}
          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)} 
              className="p-1 rounded-full hover:bg-gray-700 transition-colors"
            >
              <EllipsisHorizontalIcon className="h-6 w-6 text-gray-400" />
            </button>
            
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-48 bg-[#2A2D45] rounded-lg shadow-xl z-10 py-1 border border-purple-900/20"
              >
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-purple-600 hover:text-white transition-colors">
                  Report
                </button>
                {user?.id === vibe.user_id && (
                  <button className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600/20 transition-colors">
                    Delete
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Caption */}
        {vibe.caption && (
          <p className="mt-2 text-gray-300 text-sm">{vibe.caption}</p>
        )}
      </div>
      
      {/* Vibe content - photo, video, sticker */}
      <div className="px-4 mb-4">
        {renderVibeContent()}
      </div>
      
      {/* Action buttons */}
      <div className="px-4 pb-4">
        <div className="flex justify-between">
          <div className="flex space-x-4">
            <button 
              onClick={handleLikeToggle}
              className="flex items-center space-x-1 group"
            >
              <motion.div
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className={`p-1.5 rounded-full ${isLiked ? 'bg-red-500/20' : 'bg-gray-800 group-hover:bg-gray-700'}`}
              >
                {isLiked ? (
                  <HeartIconSolid className="h-5 w-5 text-red-500" />
                ) : (
                  <HeartIcon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                )}
              </motion.div>
              <span className={`text-xs ${isLiked ? 'text-red-500' : 'text-gray-400 group-hover:text-white'}`}>
                {likesCount}
              </span>
            </button>
            
            <button 
              onClick={handleOpenComments}
              className="flex items-center space-x-1 group"
            >
              <motion.div
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 rounded-full bg-gray-800 group-hover:bg-gray-700"
              >
                <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
              </motion.div>
              <span className="text-xs text-gray-400 group-hover:text-white">
                {vibe.stats?.total_comments || 0}
              </span>
            </button>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            className="p-1.5 rounded-full bg-gray-800 hover:bg-gray-700"
          >
            <ShareIcon className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
          </motion.button>
        </div>
        
        {/* Like count */}
        {likesCount > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Liked by <span className="font-semibold text-white">{likesCount}</span> {likesCount === 1 ? 'person' : 'people'}
          </p>
        )}
        
        {/* Location if available */}
        {vibe.location && (
          <p className="text-xs text-purple-400 mt-1 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {vibe.location}
          </p>
        )}
      </div>
      
      {/* Comments modal */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowComments(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-gradient-to-br from-[#252742] to-[#1E2136] rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Comments header */}
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Comments</h3>
                <button 
                  onClick={() => setShowComments(false)}
                  className="p-1 rounded-full hover:bg-gray-700"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>
              
              {/* Comments list */}
              <div className="overflow-y-auto max-h-[50vh] p-4">
                {commentsLoading ? (
                  <div className="flex justify-center p-4">
                    <svg className="animate-spin h-6 w-6 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : comments.length > 0 ? (
                  comments.map(comment => (
                    <div key={comment.id} className="py-3">
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <Image
                            src={comment.profile?.image || '/images/placeholders/user-placeholder.svg'}
                            alt={comment.profile?.name || 'User'}
                            width={36}
                            height={36}
                            className="rounded-full"
                          />
                        </div>
                        <div className="flex-1 bg-gray-800/50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-white">
                              {comment.profile?.name || 'Unknown User'}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <p className="text-gray-300 text-sm mt-1">{comment.text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No comments yet</p>
                    <p className="text-sm mt-1">Be the first to comment</p>
                  </div>
                )}
              </div>
              
              {/* Comment input */}
              <div className="p-4 border-t border-gray-800">
                <form onSubmit={handleSubmitComment} className="flex items-center">
                  <div className="flex-shrink-0 mr-3">
                    <Image
                      src={user?.image || '/images/placeholders/user-placeholder.svg'}
                      alt="Your profile"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  </div>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-gray-800/50 text-white placeholder-gray-500 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="ml-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VibeCard; 