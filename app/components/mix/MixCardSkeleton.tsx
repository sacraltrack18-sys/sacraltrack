import React from 'react';
import { motion } from 'framer-motion';
import { MusicalNoteIcon } from '@heroicons/react/24/solid';

export default function MixCardSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-[#1A1C2E] to-[#252742] rounded-xl shadow-lg overflow-hidden border border-purple-500/10 relative"
    >
      {/* Стильная заглушка для изображения с анимированным градиентом */}
      <div className="relative aspect-video bg-gradient-to-r from-purple-600/20 via-indigo-600/30 to-purple-600/20 overflow-hidden">
        <div className="absolute inset-0 bg-shimmer animate-shimmer bg-size-200"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.7, 0.9, 0.7]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          >
            <MusicalNoteIcon className="w-16 h-16 text-purple-300/50" />
          </motion.div>
        </div>
      </div>
      
      <div className="p-5">
        {/* Заглушка для аватара и имени пользователя */}
        <div className="flex items-center mb-3">
          <div className="h-10 w-10 rounded-full overflow-hidden mr-3 border-2 border-purple-500/30 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-indigo-600/40 to-purple-600/30 animate-pulse"></div>
          </div>
          <div className="h-4 w-28 bg-gradient-to-r from-purple-600/40 to-indigo-600/40 rounded-md overflow-hidden relative">
            <div className="absolute inset-0 bg-shimmer animate-shimmer bg-size-200"></div>
          </div>
        </div>
        
        {/* Заглушка для заголовка с анимацией */}
        <div className="h-7 w-3/4 bg-gradient-to-r from-purple-600/40 to-indigo-600/40 rounded-md mb-2 overflow-hidden relative">
          <div className="absolute inset-0 bg-shimmer animate-shimmer bg-size-200"></div>
        </div>
        
        {/* Заглушка для описания с анимацией */}
        <div className="h-4 w-full bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-md mb-1 overflow-hidden relative">
          <div className="absolute inset-0 bg-shimmer animate-shimmer bg-size-200"></div>
        </div>
        <div className="h-4 w-2/3 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-md mb-3 overflow-hidden relative">
          <div className="absolute inset-0 bg-shimmer animate-shimmer bg-size-200"></div>
        </div>
        
        {/* Заглушка для нижней информации */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-20 bg-gradient-to-r from-purple-600/50 to-indigo-600/50 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 bg-shimmer animate-shimmer bg-size-200"></div>
            </div>
            <div className="h-4 w-24 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-md overflow-hidden relative">
              <div className="absolute inset-0 bg-shimmer animate-shimmer bg-size-200"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-gradient-to-r from-purple-600/40 to-indigo-600/40 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 bg-shimmer animate-shimmer bg-size-200"></div>
            </div>
            <div className="h-4 w-6 bg-gradient-to-r from-purple-600/40 to-indigo-600/40 rounded-md overflow-hidden relative">
              <div className="absolute inset-0 bg-shimmer animate-shimmer bg-size-200"></div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}