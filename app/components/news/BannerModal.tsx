"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  XMarkIcon,
  HeartIcon,
  ShareIcon,
  CalendarIcon,
  UserIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  DocumentDuplicateIcon
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import {
  FaTwitter,
  FaFacebook,
  FaTelegram,
  FaVk
} from 'react-icons/fa';
import { toast } from "react-hot-toast";

interface BannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  banner: {
    $id: string;
    image_url: string;
    title: string;
    subtitle?: string;
    description?: string;
    link_url?: string;
    action_text?: string;
    bg_color?: string;
    text_color?: string;
  };
}

const BannerModal: React.FC<BannerModalProps> = ({ isOpen, onClose, banner }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(1247);
  const [viewCount] = useState(15420);
  const [commentCount] = useState(89);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Dummy data для примера
  const dummyData = {
    author: "SacralTrack Team",
    publishDate: "2024-01-15T10:30:00Z",
    readTime: "5 min read",
    category: "Platform Updates",
    tags: ["Music", "Technology", "Innovation", "Streaming"],
    content: `
      <div class="prose prose-invert max-w-none">
        <h2 class="text-2xl font-bold text-white mb-4">🎵 Revolutionary Music Experience</h2>
        
        <p class="text-gray-300 mb-6">
          Experience the next evolution in music streaming with SACRAL TRACK's comprehensive platform update. 
          Our latest release introduces groundbreaking features designed to create deeper connections between 
          artists and listeners through innovative technology and enhanced functionality.
        </p>

        <h3 class="text-xl font-semibold text-white mb-3">✨ What's New</h3>
        <ul class="text-gray-300 mb-6 space-y-2">
          <li>• <strong>AI-Powered Recommendations:</strong> Discover music that perfectly matches your mood and taste</li>
          <li>• <strong>Enhanced Audio Quality:</strong> Experience crystal-clear sound with our new audio engine</li>
          <li>• <strong>Social Features:</strong> Connect with friends and share your musical journey</li>
          <li>• <strong>Artist Collaboration Tools:</strong> New ways for artists to engage with their audience</li>
          <li>• <strong>Immersive Visualizations:</strong> Beautiful audio-reactive visuals for every track</li>
        </ul>

        <h3 class="text-xl font-semibold text-white mb-3">🚀 Performance Improvements</h3>
        <p class="text-gray-300 mb-6">
          We've completely rebuilt our core infrastructure to deliver lightning-fast performance. 
          Enjoy instant track loading, seamless transitions, and a smoother overall experience 
          across all devices.
        </p>

        <div class="bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-6 rounded-xl border border-purple-500/20 mb-6">
          <h4 class="text-lg font-semibold text-white mb-2">💡 Pro Tip</h4>
          <p class="text-gray-300">
            Enable notifications to be the first to know about new features, exclusive content, 
            and special events from your favorite artists.
          </p>
        </div>

        <h3 class="text-xl font-semibold text-white mb-3">🎨 Design Revolution</h3>
        <p class="text-gray-300 mb-6">
          Our new interface combines stunning visuals with intuitive functionality. Every element 
          has been carefully crafted to enhance your musical journey while maintaining the 
          aesthetic beauty that makes SACRAL TRACK unique.
        </p>

        <blockquote class="border-l-4 border-purple-500 pl-6 italic text-gray-300 mb-6">
          "Music is the universal language of mankind, and technology should amplify its power 
          to connect souls across the world." - SACRAL TRACK Philosophy
        </blockquote>

        <p class="text-gray-300">
          Join millions of music lovers who have already upgraded their listening experience. 
          The future of music streaming is here, and it's more beautiful than ever.
        </p>
      </div>
    `
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    toast.success(isLiked ? "Removed from favorites" : "Added to favorites!");
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const shareToSocialMedia = (platform: string) => {
    const url = encodeURIComponent(window.location.origin + '/news/banner/' + banner.$id);
    const title = encodeURIComponent(banner.title);
    const description = encodeURIComponent(banner.subtitle || banner.description || '');

    let shareUrl = "";
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=Check out this article: ${title}&url=${url}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${url}&text=Check out this article: ${title}`;
        break;
      case 'vk':
        shareUrl = `https://vk.com/share.php?url=${url}&title=${title}&description=${description}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    setIsShareModalOpen(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/news/banner/' + banner.$id);
      toast.success('Link copied to clipboard!', {
        icon: '🔗',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    } catch (err) {
      console.error('Error copying link:', err);
      toast.error('Could not copy link', {
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px'
        }
      });
    }
    setIsShareModalOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        style={{ paddingTop: '50px' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-gradient-to-br from-[#1E2136] to-[#2A2F4A] rounded-2xl max-w-4xl w-full max-h-[calc(90vh-50px)] overflow-hidden shadow-2xl border border-purple-500/20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative h-64 overflow-hidden">
            <Image
              src={banner.image_url}
              alt={banner.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E2136] via-transparent to-transparent" />
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-10"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>

            {/* Category badge */}
            <div className="absolute top-4 left-4 px-3 py-1 bg-purple-600/80 backdrop-blur-sm rounded-full">
              <span className="text-white text-sm font-medium">{dummyData.category}</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-19rem)]">
            {/* Title and meta */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-3">{banner.title}</h1>
              {banner.subtitle && (
                <h2 className="text-xl text-gray-300 mb-4">{banner.subtitle}</h2>
              )}
              
              {/* Meta information */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>{dummyData.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{formatDate(dummyData.publishDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <EyeIcon className="w-4 h-4" />
                  <span>{viewCount.toLocaleString()} views</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  <span>{commentCount} comments</span>
                </div>
                <span>• {dummyData.readTime}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    isLiked 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {isLiked ? (
                    <HeartIconSolid className="w-5 h-5" />
                  ) : (
                    <HeartIcon className="w-5 h-5" />
                  )}
                  <span>{likeCount}</span>
                </button>
                
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full transition-all"
                >
                  <ShareIcon className="w-5 h-5" />
                  <span>Share</span>
                </button>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {dummyData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm border border-purple-500/30"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Article content */}
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: dummyData.content }}
            />
          </div>
        </motion.div>

        {/* Share Modal */}
        <AnimatePresence>
          {isShareModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex items-center justify-center p-4"
              onClick={() => setIsShareModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-gradient-to-br from-[#24183D] to-[#0F172A] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Share this Article</h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsShareModalOpen(false)}
                    className="p-1 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6 text-gray-400" />
                  </motion.button>
                </div>

                <div className="mb-6 bg-black/20 rounded-xl p-3 border border-white/5 flex items-center space-x-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={banner.image_url}
                      alt={banner.title || 'Article preview'}
                      className="object-cover w-full h-full"
                      width={64}
                      height={64}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm mb-1 truncate">
                      {banner.title}
                    </h4>
                    <p className="text-gray-400 text-xs truncate">
                      {banner.subtitle || banner.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => shareToSocialMedia('vk')}
                    className="flex flex-col items-center p-4 rounded-xl bg-[#4C75A3]/10 hover:bg-[#4C75A3]/20 border border-[#4C75A3]/30 transition-all"
                  >
                    <FaVk className="text-[#4C75A3] text-2xl mb-2" />
                    <span className="text-white text-sm font-medium">VK</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => shareToSocialMedia('telegram')}
                    className="flex flex-col items-center p-4 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 transition-all"
                  >
                    <FaTelegram className="text-[#0088cc] text-2xl mb-2" />
                    <span className="text-white text-sm font-medium">Telegram</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => shareToSocialMedia('twitter')}
                    className="flex flex-col items-center p-4 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 transition-all"
                  >
                    <FaTwitter className="text-[#1DA1F2] text-2xl mb-2" />
                    <span className="text-white text-sm font-medium">Twitter</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => shareToSocialMedia('facebook')}
                    className="flex flex-col items-center p-4 rounded-xl bg-[#4267B2]/10 hover:bg-[#4267B2]/20 border border-[#4267B2]/30 transition-all"
                  >
                    <FaFacebook className="text-[#4267B2] text-2xl mb-2" />
                    <span className="text-white text-sm font-medium">Facebook</span>
                  </motion.button>
                </div>

                {/* Copy link button */}
                <motion.button
                  whileHover={{ scale: 1.03, backgroundColor: 'rgba(32, 221, 187, 0.9)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={copyToClipboard}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#20DDBB] to-[#20DDBB]/90 text-white font-medium shadow-lg shadow-[#20DDBB]/20 flex items-center justify-center"
                >
                  <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                  Copy Link to Clipboard
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default BannerModal;
