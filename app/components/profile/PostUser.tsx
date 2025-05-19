"use client";

import { useEffect, useState, useCallback, useRef, memo } from "react";
import Link from "next/link";
import { useUser } from "@/app/context/user";
import { useRouter } from "next/navigation";
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { PostUserCompTypes } from "@/app/types";
import toast from "react-hot-toast";
import useDeletePostById from "@/app/hooks/useDeletePostById";
import { BsThreeDotsVertical, BsDownload, BsPlayFill, BsPauseFill, BsChat, BsTrash, BsXCircle, BsCheck2Circle, BsGraphUp, BsPersonCheck, BsGlobe, BsLaptop } from 'react-icons/bs';
import { FaChartLine, FaFileDownload, FaExclamationTriangle, FaCheckCircle, FaHeadphones, FaUsers, FaMobileAlt, FaPlay, FaPause, FaGlobeAmericas } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import EditTrackPopup from "@/app/components/trackedit/EditTrackPopup";
import useAudioPlayer from '@/app/hooks/useAudioPlayer';
import useTrackStatistics from '@/app/hooks/useTrackStatistics';
import useTrackInteraction from '@/app/hooks/useTrackInteraction';
import { AudioPlayer } from '@/app/components/AudioPlayer';
import { format } from 'date-fns';
import { AiFillStar } from 'react-icons/ai';
import { useCommentStore } from "@/app/stores/comment";
import { useGeneralStore } from "@/app/stores/general";
import PostMainLikes from "@/app/components/PostMainLikes";
import Image from 'next/image';
import FloatingComments from '@/app/components/FloatingComments';
import { HiMusicNote } from 'react-icons/hi';
import { database, ID } from '@/libs/AppWriteClient';
import { APPWRITE_CONFIG } from '@/libs/AppWriteClient';
import { usePlayerContext } from '@/app/context/playerContext';
import { useEditContext } from "@/app/context/editContext";

const PostUserSkeleton = () => (
  <div className="relative bg-[#24183D] rounded-xl w-full max-w-[95%] sm:max-w-[450px] mx-auto mb-4 overflow-hidden">
    <div className="p-4 border-b border-white/10">
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
        <div className="space-y-2">
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
            <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>

    <div className="relative w-full aspect-square bg-white/5 animate-pulse">
      <div className="absolute inset-0 flex items-center justify-center">
        <Image 
          src="/images/T-logo.svg" 
          alt="Loading" 
          width={64} 
          height={64} 
          className="opacity-10"
        />
      </div>
    </div>

    <div className="p-4">
      <div className="h-12 bg-white/5 rounded-lg animate-pulse" />
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
      <div className="flex items-center gap-6">
          <div className="h-8 w-20 bg-white/5 rounded animate-pulse" />
          <div className="h-8 w-20 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="h-8 w-8 bg-white/5 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

// DeleteConfirmationModal component
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  trackName: string;
  isDeleting: boolean;
}

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, trackName, isDeleting }: DeleteConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ 
          type: "spring", 
          damping: 25, 
          stiffness: 300,
          duration: 0.4 
        }}
        className="glass-effect bg-gradient-to-br from-[#272B43]/80 to-[#1A1E36]/90 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-white/10 shadow-[0_0_25px_rgba(32,221,187,0.15)]"
        onClick={e => e.stopPropagation()}
      >
        <motion.div 
          className="flex flex-col items-center gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          <motion.div 
            variants={{
              hidden: { scale: 0.8, opacity: 0 },
              visible: { scale: 1, opacity: 1 }
            }}
            className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-red-600/20 backdrop-blur-sm animate-pulse"></div>
            <BsTrash size={32} className="text-red-400 relative z-10" />
          </motion.div>
          
          <motion.h3 
            variants={{
              hidden: { y: -20, opacity: 0 },
              visible: { y: 0, opacity: 1 }
            }}
            className="text-2xl font-bold text-white text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300"
          >
            Delete Release
          </motion.h3>
          
          <motion.p 
            variants={{
              hidden: { y: -10, opacity: 0 },
              visible: { y: 0, opacity: 1 }
            }}
            className="text-[#A6B1D0] text-center"
          >
            Are you sure you want to delete <span className="text-white font-semibold">"{trackName}"</span>? This action cannot be undone.
          </motion.p>
          
          <motion.div 
            variants={{
              hidden: { y: 10, opacity: 0 },
              visible: { y: 0, opacity: 1 }
            }}
            className="flex gap-4 w-full mt-2"
          >
            <motion.button
              whileHover={{ scale: 1.03, backgroundColor: 'rgba(63, 45, 99, 0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-[#3f2d63]/20 text-[#A6B1D0] rounded-xl hover:bg-[#3f2d63]/30 transition-all border border-[#3f2d63]/50"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, backgroundColor: 'rgba(239, 68, 68, 0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 rounded-xl transition-all bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 relative overflow-hidden"
            >
              {isDeleting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                <>
                  <span className="relative z-10">Delete</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 hover:opacity-100 transition-opacity duration-500 animate-shine"></div>
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// SuccessModal component
interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuccessModal = ({ isOpen, onClose }: SuccessModalProps) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ 
          type: "spring", 
          damping: 25, 
          stiffness: 300,
          duration: 0.4 
        }}
        className="glass-effect bg-gradient-to-br from-[#272B43]/80 to-[#1A1E36]/90 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-white/10 shadow-[0_0_25px_rgba(32,221,187,0.15)]"
        onClick={e => e.stopPropagation()}
      >
        <motion.div 
          className="flex flex-col items-center gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          <motion.div 
            variants={{
              hidden: { scale: 0.8, opacity: 0, rotate: -180 },
              visible: { 
                scale: 1, 
                opacity: 1, 
                rotate: 0,
                transition: {
                  type: "spring",
                  damping: 10,
                  stiffness: 100
                }
              }
            }}
            className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-green-600/20 backdrop-blur-sm"></div>
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                boxShadow: [
                  "0 0 0 0 rgba(32, 221, 187, 0)",
                  "0 0 0 10px rgba(32, 221, 187, 0.2)",
                  "0 0 0 20px rgba(32, 221, 187, 0)"
                ]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity, 
                repeatType: "loop"
              }}
              className="relative z-10"
            >
              <BsCheck2Circle size={40} className="text-green-400" />
            </motion.div>
          </motion.div>
          
          <motion.h3 
            variants={{
              hidden: { y: -20, opacity: 0 },
              visible: { y: 0, opacity: 1 }
            }}
            className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-[#20DDBB]"
          >
            Release Successfully Deleted
          </motion.h3>
          
          <motion.p 
            variants={{
              hidden: { y: -10, opacity: 0 },
              visible: { y: 0, opacity: 1 }
            }}
            className="text-[#A6B1D0] text-center"
          >
            Dear artist, your release has been deleted. The changes will take effect after your profile page refreshes.
          </motion.p>
          
          <motion.button
            variants={{
              hidden: { y: 10, opacity: 0 },
              visible: { y: 0, opacity: 1 }
            }}
            whileHover={{ scale: 1.03, backgroundColor: 'rgba(32, 221, 187, 0.2)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl transition-all bg-[#20DDBB]/10 text-[#20DDBB] border border-[#20DDBB]/30 relative overflow-hidden mt-2"
          >
            <span className="relative z-10">OK</span>
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-[#20DDBB]/0 via-[#20DDBB]/20 to-[#20DDBB]/0"
              animate={{ 
                x: ["100%", "-100%"],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// Custom Toast Components
const SuccessToast = ({ message }: { message: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1A2338]/90 to-[#24183D]/90 backdrop-blur-md rounded-xl border border-green-500/30 shadow-lg">
    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
      <FaCheckCircle className="text-green-400" size={20} />
    </div>
    <p className="text-white font-medium">{message}</p>
  </div>
);

const ErrorToast = ({ message }: { message: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1A2338]/90 to-[#24183D]/90 backdrop-blur-md rounded-xl border border-red-500/30 shadow-lg">
    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
      <FaExclamationTriangle className="text-red-400" size={20} />
    </div>
    <p className="text-white font-medium">{message}</p>
  </div>
);

const DownloadToast = ({ message }: { message: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1A2338]/90 to-[#24183D]/90 backdrop-blur-md rounded-xl border border-[#20DDBB]/30 shadow-lg">
    <div className="w-10 h-10 bg-[#20DDBB]/20 rounded-full flex items-center justify-center">
      <FaFileDownload className="text-[#20DDBB]" size={20} />
    </div>
    <p className="text-white font-medium">{message}</p>
  </div>
);

// Add stats toast notification
const StatsToast = ({ message }: { message: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1A2338]/90 to-[#24183D]/90 backdrop-blur-md rounded-xl border border-purple-500/30 shadow-lg">
    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
      <FaChartLine className="text-purple-400" size={20} />
    </div>
    <p className="text-white font-medium">{message}</p>
  </div>
);

// Sound wave animation component
const SoundWave = memo(() => {
  // Store random values in refs to ensure consistent renders
  const randomValues = useRef([...Array(5)].map(() => ({
    height: 8 + Math.floor(Math.random() * 8),
    duration: (0.8 + Math.random() * 0.5).toFixed(2)
  })));

  return (
    <div className="flex items-center justify-center space-x-1 h-12 absolute bottom-4 left-0 right-0 pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-white/70 rounded-full"
          initial={{ height: 4 }}
          animate={{ 
            height: [4, randomValues.current[i].height, 4],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{
            duration: Number(randomValues.current[i].duration),
            repeat: Infinity,
            repeatType: "reverse",
            delay: i * 0.1
          }}
        />
      ))}
    </div>
  );
});

SoundWave.displayName = 'SoundWave';

export const PostUser = ({ params, post, userId }: PostUserCompTypes) => {
  const router = useRouter();
  const contextUser = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showStats, setShowStats] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isEditMode, setIsEditMode } = useEditContext();

  const { statistics, isLoading: statsLoading, fetchStatistics } = useTrackStatistics(post?.id);
  const { recordInteraction, getUserDeviceInfo, getGeographicInfo } = useTrackInteraction();
  const isOwner = contextUser?.user?.id === post?.user_id;

  const { commentsByPost, setCommentsByPost, getCommentsByPostId } = useCommentStore();
  const { setIsLoginOpen } = useGeneralStore();

  const { currentAudioId, setCurrentAudioId, isPlaying: isGlobalPlaying, stopAllPlayback } = usePlayerContext();
  const isActiveInPlayer = currentAudioId === post?.id;

  useEffect(() => {
    const loadComments = async () => {
      if (post?.id) {
        await setCommentsByPost(post.id);
      }
    };
    loadComments();
  }, [post?.id]);
  
  useEffect(() => {
    // Simulate loading time and data fetching
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Обновляем статистику при открытии панели статистики (более частое обновление)
  useEffect(() => {
    if (showStats && post?.id) {
      // Принудительно обновляем статистику при открытии панели
      // Используем fetchStatistics как ручное обновление, оно не влияет на лимит
      fetchStatistics();
      
      // Обновляем статистику каждые 3 секунды, пока панель открыта
      // Эти обновления тоже считаются ручными, так как пользователь явно открыл панель
      const interval = setInterval(() => {
        fetchStatistics();
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [showStats, post?.id, fetchStatistics]);

  const handlePlay = async () => {
    if (!post?.m3u8_url) {
      console.error('Missing m3u8_url for post:', post?.id);
      return;
    }

    const deviceInfo = getUserDeviceInfo();
    const geoInfo = await getGeographicInfo();
    
    // Запись взаимодействия пользователя с треком
    try {
      await recordInteraction({
        track_id: post.id,
        user_id: contextUser?.user?.id || 'anonymous',
        interaction_type: 'play',
        device_info: deviceInfo,
        geographic_info: geoInfo
      });
      
      // Обновляем статистику после записи взаимодействия
      // Это ручное обновление, так как вызвано действием пользователя
      if (post?.id) {
        // Принудительно запрашиваем свежие данные статистики
        setTimeout(() => {
          fetchStatistics();
        }, 500);
      }
    } catch (error) {
      console.error('Error recording interaction:', error);
    }

    // Управление глобальным состоянием воспроизведения через PlayerContext
    if (isActiveInPlayer && isGlobalPlaying) {
      // Если этот трек уже воспроизводится, останавливаем его
      stopAllPlayback();
      setCurrentAudioId(null);
      setIsPlaying(false);
    } else {
      // Если другой трек воспроизводится или ничего не играет,
      // устанавливаем текущий трек как активный
      setCurrentAudioId(post.id);
      setIsPlaying(true);
    }
  };

  // Синхронизируем локальное состояние isPlaying с глобальным состоянием PlayerContext
  useEffect(() => {
    setIsPlaying(isActiveInPlayer && isGlobalPlaying);
  }, [isActiveInPlayer, isGlobalPlaying]);

  const handleDownload = async () => {
    try {
      const audioUrl = useCreateBucketUrl(post.audio_url);
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      // Create a temporary link element
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = `${post.trackname || 'track'}.wav`;
      
      // Append to document, click, and remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Cleanup
      URL.revokeObjectURL(downloadLink.href);
      
      toast.custom((t) => (
        <DownloadToast message={`Track "${post.trackname}" downloaded successfully!`} />
      ), { duration: 3000 });
    } catch (error) {
      console.error('Error downloading track:', error);
      toast.custom((t) => (
        <ErrorToast message="Couldn't download the track. Please try again." />
      ), { duration: 4000 });
    }
  };

  const handleDeletePost = useCallback(async () => {
    setIsDeleting(true);
    try {
      await useDeletePostById(params?.postId, post?.audio_url);
      setIsDeleting(false);
      setShowDeleteModal(false);
      setShowSuccessModal(true);
      // Redirect after modal is closed
    } catch (error) {
      console.error(error);
      setIsDeleting(false);
      toast.custom((t) => (
        <ErrorToast message="We couldn't process your deletion request. Please try again later." />
      ), { duration: 4000 });
    }
  }, [params, post]);

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMMM d, yyyy");
  };

  const handleComments = (e: React.MouseEvent) => {
    // Add stopPropagation to prevent the event from bubbling up to parent elements (like the play button)
    if (e) e.stopPropagation();
    
    if (!contextUser?.user) {
      setIsLoginOpen(true);
      return;
    }
    router.push(`/post/${post.user_id}/${post.id}`);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    router.push(`/profile/${params.userId}`);
  };

  // Update the function that opens the edit popup
  const handleOpenEditPopup = () => {
    setShowEditPopup(true);
    setIsDropdownOpen(false);
    setIsEditMode(true); // Set edit mode to true, which will trigger bottom panel animation
  };

  // Update the edit popup close handler
  const handleCloseEditPopup = () => {
    setShowEditPopup(false);
    setIsEditMode(false); // Set edit mode to false, which will restore bottom panel
  };

  if (isLoading) {
    return <PostUserSkeleton />;
  }

  return ( 
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative bg-[#24183D] rounded-xl w-full max-w-[95%] sm:max-w-[450px] mx-auto mb-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="p-4 border-b border-white/10"
          >
            <div className="flex items-center justify-between">
              <Link href={`/profile/${post.user_id}`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <img 
                    src={useCreateBucketUrl(post?.profile?.image) || '/images/placeholders/user-placeholder.svg'}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                  />
                  <div>
                    <div>
                      <p className="text-sm sm:text-base font-semibold text-white hover:text-[#20DDBB] transition-colors truncate max-w-[140px] sm:max-w-[200px]">
                        {post?.profile?.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-400 truncate max-w-[140px] sm:max-w-[200px]">{post?.trackname}</p>
                    </div>
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                {isOwner && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowStats(!showStats)}
                      className={`p-2 rounded-full transition-colors ${
                        showStats 
                          ? 'text-[#20DDBB] bg-[#20DDBB]/10'
                          : 'text-white/80 hover:text-[#20DDBB] bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <FaChartLine size={isMobile ? 18 : 20} />
                    </motion.button>

                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="p-2 text-zinc-400 hover:text-white transition-colors rounded-full bg-white/5 hover:bg-white/10"
                      >
                        <BsThreeDotsVertical size={isMobile ? 18 : 20} />
                      </motion.button>

                      <AnimatePresence>
                        {isDropdownOpen && (
                          <>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-30"
                              onClick={() => setIsDropdownOpen(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 mt-2 w-48 bg-[#2E2469] rounded-xl shadow-xl border border-white/10 overflow-hidden z-40"
                            >
                              <motion.button
                                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                onClick={handleOpenEditPopup}
                                className="w-full px-4 py-3 text-left text-sm text-white/90 hover:text-white flex items-center space-x-2 transition-colors"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span>Edit Track</span>
                              </motion.button>
                              
                              <motion.button
                                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                onClick={() => {
                                  setShowDeleteModal(true);
                                  setIsDropdownOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:text-red-300 flex items-center space-x-2 transition-colors"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span>Delete Track</span>
                              </motion.button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative w-full group"
          >
            <img 
              className="w-full aspect-square object-cover"
              src={useCreateBucketUrl(post?.image_url)}
            />
            
            <div className={`absolute inset-0 transition-all duration-300 ${
              showStats 
                ? 'bg-black/80 backdrop-blur-md' 
                : 'bg-transparent'
            }`} />
            
            {!showStats && (
              <>
                {/* Desktop play/pause overlay - показываем при наведении */}
                {!isMobile && (
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div 
                      onClick={handlePlay}
                      className={`
                        w-14 h-14 rounded-full border border-white/40 backdrop-blur-[2px] flex items-center justify-center
                        transform transition-all duration-300 cursor-pointer
                        ${isPlaying ? 'scale-90 bg-[#20DDBB]/10 border-[#20DDBB]/40' : 'scale-100 bg-black/10'}
                        group-hover:bg-black/20
                      `}
                    >
                      {isPlaying ? (
                        <FaPause className="text-white/90 text-lg" aria-hidden="true" />
                      ) : (
                        <FaPlay className="text-white/90 text-lg ml-1" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                )}
                
                {/* Mobile play button - более прозрачный дизайн */}
                {isMobile && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePlay();
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label={isPlaying ? 'Pause track' : 'Play track'}
                    type="button"
                  >
                    <div className={`
                      w-16 h-16 rounded-full border border-white/60 backdrop-blur-[2px] flex items-center justify-center
                      transform transition-all duration-300 
                      ${isPlaying ? 'scale-90 bg-[#20DDBB]/20 border-[#20DDBB]/40' : 'scale-100 bg-black/20'}
                    `}>
                      {isPlaying ? (
                        <FaPause className="text-white text-xl" aria-hidden="true" />
                      ) : (
                        <FaPlay className="text-white text-xl ml-1" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                )}

                {/* Sound wave animation when playing */}
                {isPlaying && <SoundWave />}

                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-2 sm:top-4 right-2 sm:right-4 flex flex-col gap-1 sm:gap-2 items-end z-10"
                >
                  <div className="flex items-center gap-1 bg-gradient-to-r from-amber-200 to-yellow-400 text-black text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">
                    <AiFillStar className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                    <span className="truncate max-w-[120px] sm:max-w-none">Release • {formatReleaseDate(post?.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm text-white/80 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                    <span>{post?.genre || 'Unknown genre'}</span>
                  </div>
                </motion.div>

                <FloatingComments 
                  comments={post?.id ? getCommentsByPostId(post.id) : []}
                  onClick={handleComments}
                />
              </>
            )}

            <AnimatePresence>
              {showStats && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 p-6 flex items-center justify-center"
                >
                  {statsLoading ? (
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#20DDBB] border-t-transparent" />
                    </div>
                  ) : (
                    <div className="w-full grid grid-cols-2 gap-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:shadow-lg hover:border-[#20DDBB]/30 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-[#20DDBB]/20 flex items-center justify-center">
                            <FaHeadphones className="text-[#20DDBB]" />
                          </div>
                          <p className="text-sm text-white/60">Total Plays</p>
                        </div>
                        <p className="text-2xl font-bold text-white mt-1 flex items-center">
                          {parseInt(statistics?.plays_count || "0", 10)}
                          {parseInt(statistics?.plays_count || "0", 10) > 0 && (
                            <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                              +{Math.round(parseInt(statistics?.plays_count || "0", 10) * 0.05)} this week
                            </span>
                          )}
                        </p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:shadow-lg hover:border-[#20DDBB]/30 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <FaUsers className="text-blue-400" />
                          </div>
                          <p className="text-sm text-white/60">Unique Listeners</p>
                        </div>
                        <p className="text-2xl font-bold text-white mt-1">
                          {statistics?.unique_listeners || 0}
                        </p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:shadow-lg hover:border-[#20DDBB]/30 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <FaGlobeAmericas className="text-purple-400" />
                          </div>
                          <p className="text-sm text-white/60">Top Country</p>
                        </div>
                        <p className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                          {Object.entries(statistics?.geographic_data || {}).length > 0 ? 
                            String(Object.entries(statistics?.geographic_data || {})
                              .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0])
                            : 'N/A'}
                          {Object.entries(statistics?.geographic_data || {}).length > 0 && (
                            <span className="text-sm text-white/60 font-normal">
                              {String(Object.entries(statistics?.geographic_data || {})
                                .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[1] || 0)} plays
                            </span>
                          )}
                        </p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:shadow-lg hover:border-[#20DDBB]/30 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <FaMobileAlt className="text-amber-400" />
                          </div>
                          <p className="text-sm text-white/60">Top Device</p>
                        </div>
                        <p className="text-xl font-bold text-white mt-1 capitalize">
                          {Object.entries(statistics?.device_types || {}).length > 0 ?
                            String(Object.entries(statistics?.device_types || {})
                              .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0])
                            : 'N/A'}
                        </p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="col-span-2 mt-2"
                      >
                        <motion.button
                          whileHover={{ scale: 1.02, backgroundColor: 'rgba(32, 221, 187, 0.2)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setShowStats(false);
                            toast.custom((t) => (
                              <StatsToast message={`Your track "${post.trackname}" has been played ${parseInt(statistics?.plays_count || "0", 10)} times!`} />
                            ), { duration: 4000 });
                          }}
                          className="w-full py-2.5 px-4 rounded-xl transition-all bg-[#20DDBB]/10 text-[#20DDBB] border border-[#20DDBB]/30 flex items-center justify-center gap-2"
                        >
                          <span>View Full Analytics</span>
                          <BsGraphUp />
                        </motion.button>
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4"
          >
            <AudioPlayer 
              m3u8Url={useCreateBucketUrl(post?.m3u8_url)}
              isPlaying={isPlaying}
              onPlay={() => {
                setCurrentAudioId(post.id);
                setIsPlaying(true);
              }}
              onPause={() => {
                stopAllPlayback();
                setIsPlaying(false);
              }}
            />

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10"
            >
              <div className="flex items-center gap-3 sm:gap-6">
                <PostMainLikes post={post} />
              </div>

              {contextUser?.user?.id === post?.user_id && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDownload}
                  className="p-1.5 sm:p-0 rounded-full bg-white/5 sm:bg-transparent text-white/80 hover:text-[#20DDBB] transition-colors"
                >
                  <BsDownload size={18} className="sm:w-5 sm:h-5" />
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        </div>

        <EditTrackPopup
          postData={post}
          isOpen={showEditPopup}
          onClose={handleCloseEditPopup}
          onUpdate={(updatedData) => {
            console.log("Updated Data:", updatedData);
            handleCloseEditPopup();
          }}
        />
      </motion.div>

      <AnimatePresence>
        {showDeleteModal && (
          <DeleteConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeletePost}
            trackName={post?.trackname || ""}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessModal && (
          <SuccessModal
            isOpen={showSuccessModal}
            onClose={handleSuccessModalClose}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default PostUser;

