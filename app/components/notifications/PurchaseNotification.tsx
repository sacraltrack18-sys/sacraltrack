"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import Link from 'next/link';

interface PurchaseNotificationProps {
  buyer: {
    id: string;
    name: string;
    image: string;
  };
  track: {
    name: string;
    amount: string;
  };
  onClose: () => void;
}

const PurchaseNotification = ({ buyer, track, onClose }: PurchaseNotificationProps) => {
  // Auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed bottom-5 left-5 bg-[#272B43] p-4 rounded-xl shadow-lg z-50 border border-[#3f2d63]"
    >
      <div className="flex items-center gap-4">
        <Link href={`/profile/${buyer.id}`} className="relative">
          <img 
            src={buyer.image} 
            alt={buyer.name}
            className="w-12 h-12 rounded-full border-2 border-[#20DDBB]" 
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-[#20DDBB] rounded-full"
          />
        </Link>
        <div>
          <Link href={`/profile/${buyer.id}`}>
            <p className="text-white font-bold hover:text-[#20DDBB] transition-colors">
              {buyer.name}
            </p>
          </Link>
          <div className="flex items-center gap-2">
            <p className="text-[#818BAC]">purchased your track for</p>
            <span className="text-[#20DDBB] font-bold">${track.amount}</span>
          </div>
          <p className="text-white text-sm mt-1">"{track.name}"</p>
        </div>
      </div>
      
      {/* Celebration animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5 }}
        className="absolute -top-2 -right-2 w-6 h-6 bg-[#20DDBB] rounded-full flex items-center justify-center"
      >
        <span className="text-black text-xs">🎉</span>
      </motion.div>
    </motion.div>
  );
};

export default PurchaseNotification; 