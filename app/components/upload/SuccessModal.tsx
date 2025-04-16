import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackname: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  isOpen, 
  onClose, 
  trackId, 
  trackname 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}></div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-[90%] max-w-md bg-gradient-to-br from-[#2A184B] to-[#1f1239] p-6 rounded-2xl border border-[#20DDBB]/20 shadow-xl relative"
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-white/60 hover:text-white">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center p-4">
          <div className="w-16 h-16 rounded-full bg-[#20DDBB]/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#20DDBB]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Upload Complete!</h3>
          <p className="text-white/70 mb-4">Your track "{trackname}" has been uploaded successfully.</p>
          
          <div className="bg-[#20DDBB]/10 p-4 rounded-lg mb-6">
            <p className="text-white/80 text-sm mb-2">
              <span className="text-[#20DDBB] font-semibold">Note:</span> Your WAV file is now being processed in the background.
            </p>
            <p className="text-white/70 text-sm">
              This includes conversion to MP3 and preparation for streaming. This will be completed automatically.
            </p>
          </div>
          
          <Link 
            href={`/track/${trackId}`} 
            className="inline-block w-full py-3 px-6 bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-black font-medium rounded-xl"
          >
            View Track
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SuccessModal; 