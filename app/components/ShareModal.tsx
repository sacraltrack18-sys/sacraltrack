"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { FiCopy } from 'react-icons/fi';
import { FaTelegramPlane, FaVk } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { PostWithProfile } from '@/app/types';
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
    post: PostWithProfile;
}

const ShareModal = ({ isOpen, onClose, post }: ShareModalProps) => {
    const imageUrl = useCreateBucketUrl(post?.image_url);
    const avatarUrl = useCreateBucketUrl(post?.profile?.image);

    const shareUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/post/${post.user_id}/${post.id}`
        : '';

    const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard!');
    } catch (err) {
            toast.error('Failed to copy link');
        }
    };

    const shareLinks = [
        {
            name: 'Telegram',
            icon: <FaTelegramPlane size={20} />,
            href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                `🎵 ${post.trackname}\n👤 ${post.profile.name}\n🎧 ${post.genre}\n\nListen on Sacral Track`
            )}`
        },
        {
            name: 'VK',
            icon: <FaVk size={20} />,
            href: `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(
                `${post.trackname} by ${post.profile.name}`
            )}&description=${encodeURIComponent(
                `Genre: ${post.genre}\nListen on Sacral Track`
            )}&image=${encodeURIComponent(imageUrl || '')}`
        }
    ];

  return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.75, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.75, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                                 bg-[#24183D] rounded-2xl p-6 shadow-xl z-50 w-[90%] max-w-md"
                    >
                        {/* Track Info */}
                        <div className="flex items-start gap-4 mb-6 p-4 bg-[#2E2469] rounded-xl">
                            <img 
                                src={imageUrl || '/images/placeholder-track.jpg'} 
                                alt={post.trackname}
                                className="w-20 h-20 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-medium text-lg truncate">
                                    {post.trackname}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <img 
                                        src={avatarUrl || '/images/placeholder-user.jpg'} 
                                        alt={post.profile.name}
                                        className="w-4 h-4 rounded-full"
                                    />
                                    <p className="text-[#818BAC] text-sm truncate">
                                        {post.profile.name}
                                    </p>
                                </div>
                                <p className="text-[#20DDBB] text-sm mt-1">
                                    {post.genre}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white text-lg font-medium">Share Track</h3>
                            <button 
                                onClick={onClose}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex gap-4 mb-6">
                            {shareLinks.map((link) => (
                                <motion.a
                                    key={link.name}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex-1 flex flex-col items-center gap-2 p-4 
                                             bg-[#2E2469] rounded-xl text-white hover:bg-[#20DDBB] 
                                             hover:text-black transition-all duration-200"
                                >
                                    {link.icon}
                                    <span className="text-sm">{link.name}</span>
                                </motion.a>
                            ))}
                        </div>

                        <div className="relative">
              <input
                type="text"
                value={shareUrl}
                readOnly
                                className="w-full px-4 py-3 bg-[#2E2469] text-white rounded-xl 
                                         focus:outline-none focus:ring-2 focus:ring-[#20DDBB]"
              />
              <button
                                onClick={handleCopy}
                                className="absolute right-2 top-1/2 -translate-y-1/2 
                                         p-2 hover:bg-[#20DDBB] rounded-lg 
                                         text-white hover:text-black transition-all duration-200"
                            >
                                <FiCopy size={20} />
              </button>
            </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
  );
};

export default ShareModal;
