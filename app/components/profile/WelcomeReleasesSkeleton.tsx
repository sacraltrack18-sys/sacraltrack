import React from 'react';
import { motion } from 'framer-motion';
import { BsVinylFill, BsArrowUpCircle } from 'react-icons/bs';
import { AiOutlinePlus } from 'react-icons/ai';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/context/user';
import { useGeneralStore } from '@/app/stores/general';
import { usePostStore } from '@/app/stores/post';

interface WelcomeReleasesSkeletonProps {
  isOwner: boolean;
}

const WelcomeReleasesSkeleton: React.FC<WelcomeReleasesSkeletonProps> = ({ isOwner }) => {
  const router = useRouter();
  const contextUser = useUser();
  const { setIsLoginOpen } = useGeneralStore();
  const { postsByUser } = usePostStore();
  
  const handleUploadClick = () => {
    if (!contextUser?.user) {
      setIsLoginOpen(true);
      return;
    }
    router.push('/upload');
  };

  // Если есть релизы, не показываем компонент
  if (postsByUser && postsByUser.length > 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-[850px] mx-auto mt-8 bg-gradient-to-br from-[#24183D]/80 to-[#1A1E36]/90 backdrop-blur-xl rounded-2xl p-10 border border-white/10 shadow-[0_0_25px_rgba(32,221,187,0.1)]"
    >
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2 
          }}
          className="relative w-24 h-24 rounded-full bg-gradient-to-r from-[#20DDBB]/20 to-[#5D59FF]/20 flex items-center justify-center"
        >
          <motion.div 
            animate={{ 
              rotate: 360,
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity,
              ease: "linear" 
            }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 blur-md"
          />

          <BsVinylFill className="text-[#20DDBB] text-5xl relative z-10" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl md:text-3xl font-bold text-white"
        >
          {isOwner ? 'Welcome to Your Profile!' : 'No Releases Yet'}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[#A6B1D0] max-w-md"
        >
          {isOwner 
            ? 'This is where your music releases will appear. Start sharing your music with the world!'
            : 'This artist hasn\'t uploaded any releases yet. Check back later for new music.'}
        </motion.p>

        {isOwner && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="pt-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUploadClick}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] rounded-xl text-white font-medium shadow-lg shadow-[#20DDBB]/20"
            >
              <AiOutlinePlus className="text-xl" />
              <span>Upload Your First Release</span>
            </motion.button>
          </motion.div>
        )}

        {/* Animated background elements */}
        <div className="absolute pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 500 - 250,
                y: Math.random() * 200 - 100,
                opacity: 0,
                scale: 0
              }}
              animate={{ 
                opacity: [0, 0.5, 0],
                scale: [0, 1, 0.5],
                x: Math.random() * 600 - 300,
                y: Math.random() * 300 - 150,
              }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                delay: i * 2,
                ease: "easeInOut"
              }}
              className="absolute w-8 h-8 text-[#20DDBB]/10"
            >
              <BsVinylFill className="w-full h-full" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pulse animation for prompting scroll */}
      {!isOwner && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 5, 0] }}
          transition={{ 
            opacity: { delay: 1, duration: 1 },
            y: { delay: 1, duration: 2, repeat: Infinity }
          }}
          className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <BsArrowUpCircle className="text-[#20DDBB]/50 text-2xl" />
          <span className="text-[#A6B1D0]/50 text-sm">Explore other artists</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default WelcomeReleasesSkeleton; 