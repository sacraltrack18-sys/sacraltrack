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
            toast.success('Link copied!', {
                icon: '🔗',
                style: {
                    background: '#20DDBB',
                    color: '#000',
                }
            });
        } catch (err) {
            toast.error('Failed to copy link');
        }
    };

    const shareLinks = [
        {
            name: 'Telegram',
            icon: <FaTelegramPlane size={24} />,
            href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                `🎵 ${post.trackname}\n👤 ${post.profile.name}\n🎧 Listen on Sacral Track`
            )}`
        },
        {
            name: 'VK',
            icon: <FaVk size={24} />,
            href: `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(
                `${post.trackname} by ${post.profile.name}`
            )}&description=${encodeURIComponent(
                `Listen on Sacral Track`
            )}&image=${encodeURIComponent(imageUrl || '')}`
        }
    ];

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    {/* Backdrop with blur effect */}
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-[100]"
                        style={{ backdropFilter: 'blur(8px)' }}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 0 }}
                        transition={{ 
                            type: "spring",
                            damping: 25,
                            stiffness: 300
                        }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                                 bg-[#24183D]/60 backdrop-blur-xl rounded-3xl p-6 sm:p-8
                                 shadow-[0_8px_32px_rgba(0,0,0,0.37)] border border-white/10
                                 z-[101] w-[95%] sm:w-[90%] max-w-md mx-auto
                                 max-h-[90vh] overflow-y-auto
                                 flex flex-col"
                    >
                        {/* Close button */}
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="absolute top-3 sm:top-4 right-3 sm:right-4 text-white/60 hover:text-white
                                     transition-colors w-8 h-8 flex items-center justify-center
                                     rounded-full bg-white/5 hover:bg-white/10 z-10"
                        >
                            ✕
                        </motion.button>

                        {/* Track Info Card */}
                        <motion.div 
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-start gap-4 mb-6 sm:mb-8 p-3 sm:p-4 
                                     bg-white/5 rounded-2xl border border-white/5
                                     hover:border-[#20DDBB]/20 transition-all duration-300"
                        >
                            <motion.img 
                                whileHover={{ scale: 1.05 }}
                                src={imageUrl || '/images/placeholder-track.jpg'} 
                                alt={post.trackname}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover ring-2 ring-white/10"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-medium text-lg sm:text-xl truncate mb-2">
                                    {post.trackname}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <img 
                                        src={avatarUrl || '/images/placeholder-user.jpg'} 
                                        alt={post.profile.name}
                                        className="w-5 h-5 rounded-full ring-1 ring-white/20"
                                    />
                                    <p className="text-[#818BAC] truncate text-sm sm:text-base">
                                        {post.profile.name}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Share buttons */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                            {shareLinks.map((link, index) => (
                                <motion.a
                                    key={link.name}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 
                                             bg-white/5 rounded-2xl border border-white/5
                                             hover:border-[#20DDBB]/20 hover:bg-[#20DDBB]/5
                                             transition-all duration-300 group"
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="text-white/70 group-hover:text-[#20DDBB] transition-colors"
                                    >
                                        {link.icon}
                                    </motion.div>
                                    <span className="text-xs sm:text-sm text-white/70 group-hover:text-white transition-colors">
                                        {link.name}
                                    </span>
                                </motion.a>
                            ))}
                        </div>

                        {/* Copy link section */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="relative mt-auto"
                        >
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 text-white/70 rounded-xl
                                         border border-white/5 focus:outline-none focus:border-[#20DDBB]/30
                                         transition-all duration-300 text-sm sm:text-base"
                            />
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleCopy}
                                className="absolute right-2 top-1/2 -translate-y-1/2 
                                         p-1.5 sm:p-2 hover:bg-[#20DDBB] rounded-lg
                                         text-white/70 hover:text-black transition-all duration-300
                                         bg-white/5"
                            >
                                <FiCopy size={18} className="sm:w-5 sm:h-5" />
                            </motion.button>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ShareModal;
