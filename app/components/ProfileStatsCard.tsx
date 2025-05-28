import React from 'react';
import { motion } from 'framer-motion';
import { BsPersonPlus, BsPersonCheck, BsPersonX } from 'react-icons/bs';

const StatItem = ({ label, value }) => (
  <div className="flex flex-col items-center">
    <span className="text-lg font-bold text-white drop-shadow-md">{value}</span>
    <span className="text-xs text-[#A6B1D0] font-medium">{label}</span>
  </div>
);

const ProfileStatsCard = ({
  stats,
  isFriend,
  pendingRequest,
  isLoading,
  onFriendAction,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="hidden lg:block fixed top-24 right-8 z-50 w-[270px] rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-sm p-4"
      style={{ minWidth: 200 }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="grid grid-cols-2 gap-4 w-full mb-1">
          <StatItem label="Releases" value={stats.releases} />
          <StatItem label="Likes" value={stats.likes} />
          <StatItem label="Listens" value={stats.listens} />
          <StatItem label="Liked" value={stats.liked} />
        </div>
        <motion.button
          onClick={onFriendAction}
          disabled={isLoading}
          whileHover={{ scale: 1.10, boxShadow: '0 2px 12px 0 #20DDBB33', opacity: 0.92 }}
          whileTap={{ scale: 0.97 }}
          className={`
            mt-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#20DDBB]/40 to-[#5D59FF]/40
            border border-white/20 shadow-sm transition-all text-white font-medium flex items-center gap-2
            backdrop-blur-sm
            ${isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}
          `}
          style={{ fontSize: 14, minHeight: 32 }}
        >
          {isLoading ? (
            <span className="animate-spin">⟳</span>
          ) : isFriend ? (
            <>
              <BsPersonCheck className="text-base" />
              Friend
            </>
          ) : pendingRequest ? (
            <>
              <BsPersonX className="text-base" />
              Request Sent
            </>
          ) : (
            <>
              <BsPersonPlus className="text-base" />
              Add Friend
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ProfileStatsCard; 