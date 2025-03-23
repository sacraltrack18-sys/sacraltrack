import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { IoMdMusicalNotes } from 'react-icons/io';
import { BsLink45Deg, BsGlobe } from 'react-icons/bs';

interface UserProfileCardProps {
  profile: {
    user_id: string;
    name: string;
    image: string;
    bio?: string;
    genre?: string;
  };
  compact?: boolean;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({ profile, compact = false }) => {
  // Get profile image URL
  const profileImageUrl = profile?.image 
    ? useCreateBucketUrl(profile.image)
    : '/images/placeholders/user-placeholder.svg';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`glass-profile-card bg-gradient-to-br from-[#24183D]/80 to-[#1A1E36]/90 
                  backdrop-blur-xl border border-white/10 shadow-[0_0_15px_rgba(32,221,187,0.1)] 
                  rounded-xl overflow-hidden w-full ${compact ? 'max-w-[280px]' : 'max-w-[350px]'}`}
    >
      <Link href={`/profile/${profile.user_id}`}>
        <div className="relative overflow-hidden group cursor-pointer">
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-[#20DDBB]/0 to-[#20DDBB]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            whileHover={{ opacity: 1 }}
          />
          
          <motion.img
            src={profileImageUrl}
            alt={profile?.name || 'Profile'}
            className={`w-full object-cover transition-transform duration-500 ${compact ? 'h-32' : 'h-48'}`}
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
          />
          
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            whileHover={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 z-20"
          >
            <p className="text-white text-sm font-medium">View profile</p>
          </motion.div>
        </div>
      </Link>
      
      <div className={`p-4 ${compact ? 'p-3' : 'p-5'}`}>
        <motion.h2 
          className={`font-bold text-white mb-1 truncate ${compact ? 'text-lg' : 'text-xl'}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {profile?.name || 'Artist Name'}
        </motion.h2>
        
        {profile?.genre && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 text-xs text-[#20DDBB] mb-3"
          >
            <IoMdMusicalNotes />
            <span>{profile.genre}</span>
          </motion.div>
        )}
        
        {profile?.bio && !compact && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[#A6B1D0] mb-4 text-sm line-clamp-2"
          >
            {profile.bio}
          </motion.p>
        )}
        
        <Link href={`/profile/${profile.user_id}`}>
          <motion.button
            whileHover={{ scale: 1.03, backgroundColor: 'rgba(32,221,187,0.2)' }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`w-full mt-1 py-2 px-4 rounded-lg bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 
                     border border-[#20DDBB]/20 text-[#20DDBB] font-medium text-sm
                     hover:from-[#20DDBB]/15 hover:to-[#5D59FF]/15 hover:border-[#20DDBB]/30
                     transition-all duration-300 flex items-center justify-center gap-2`}
          >
            <IoMdMusicalNotes className="text-[#20DDBB]" />
            <span>View Releases</span>
          </motion.button>
        </Link>
      </div>
      
      {/* Custom CSS for glass effect */}
      <style jsx global>{`
        .glass-profile-card {
          position: relative;
          z-index: 1;
        }
        
        .glass-profile-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          background: radial-gradient(circle at top right, rgba(32,221,187,0.08), transparent 70%);
          pointer-events: none;
        }
      `}</style>
    </motion.div>
  );
};

export default UserProfileCard;