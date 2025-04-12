"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaTwitter, 
  FaFacebook, 
  FaInstagram, 
  FaTelegram, 
  FaWhatsapp, 
  FaEnvelope, 
  FaLink
} from 'react-icons/fa';
import { XMarkIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface ShareVibeModalProps {
  isOpen: boolean;
  onClose: () => void;
  vibeId: string;
  vibeImageUrl?: string;
  vibeCaption?: string;
  userName?: string;
}

const ShareVibeModal: React.FC<ShareVibeModalProps> = ({
  isOpen,
  onClose,
  vibeId,
  vibeImageUrl = '/images/placeholders/default-placeholder.svg',
  vibeCaption = 'Share this musical moment',
  userName = 'Artist'
}) => {
  const [copyLinkText, setCopyLinkText] = useState('Copy Link');
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Set up event listener for closing modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const getVibeUrl = () => {
    return `${window.location.origin}/vibe/${vibeId}`;
  };
  
  const handleCopyLink = () => {
    const url = getVibeUrl();
    
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopyLinkText('Copied!');
        setTimeout(() => setCopyLinkText('Copy Link'), 2000);
        onClose();
        toast.success('Link copied to clipboard!', {
          icon: '🔗',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        });
      })
      .catch((err) => {
        console.error('Error copying link:', err);
        toast.error('Could not copy link', {
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px'
          }
        });
      });
  };

  const shareViaTwitter = () => {
    const text = `Check out this awesome vibe: "${vibeCaption}" on Sacral Track`;
    const url = getVibeUrl();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    onClose();
  };

  const shareViaFacebook = () => {
    const url = getVibeUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    onClose();
  };

  const shareViaTelegram = () => {
    const text = `Check out this awesome vibe: "${vibeCaption}" on Sacral Track`;
    const url = getVibeUrl();
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
    onClose();
  };

  const shareViaWhatsapp = () => {
    const text = `Check out this awesome vibe: "${vibeCaption}" on Sacral Track: ${getVibeUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    onClose();
  };

  const shareViaEmail = () => {
    const subject = `Check out this awesome vibe on Sacral Track`;
    const body = `Hey!\n\nI found this amazing vibe on Sacral Track: "${vibeCaption}"\n\nCheck it out here: ${getVibeUrl()}\n\nEnjoy!`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    onClose();
  };

  const shareViaInstagram = () => {
    // Instagram doesn't have a web sharing API, so we notify the user
    toast.error('Instagram sharing is not available directly. Copy the link and share it manually on Instagram.', {
      duration: 4000,
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px'
      }
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-gradient-to-br from-[#24183D] to-[#0F172A] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-white/10"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Share this Vibe</h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </motion.button>
            </div>

            <div className="mb-6 bg-black/20 rounded-xl p-3 border border-white/5 flex items-center space-x-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image 
                  src={vibeImageUrl} 
                  alt={vibeCaption || 'Vibe preview'}
                  className="object-cover w-full h-full"
                  width={64}
                  height={64}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium text-sm mb-1 truncate">
                  {userName}'s Vibe
                </h4>
                <p className="text-gray-400 text-xs truncate">
                  {vibeCaption}
                </p>
              </div>
            </div>
            
            {/* Social share options */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareViaTwitter}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/20 transition-all duration-300 group"
              >
                <FaTwitter className="text-[#1DA1F2] text-xl mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-gray-300">Twitter</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareViaFacebook}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#4267B2]/10 hover:bg-[#4267B2]/20 border border-[#4267B2]/20 transition-all duration-300 group"
              >
                <FaFacebook className="text-[#4267B2] text-xl mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-gray-300">Facebook</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareViaInstagram}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-[#833AB4]/10 via-[#FD1D1D]/10 to-[#FCAF45]/10 hover:from-[#833AB4]/20 hover:via-[#FD1D1D]/20 hover:to-[#FCAF45]/20 border border-[#E1306C]/20 transition-all duration-300 group"
              >
                <FaInstagram className="text-[#E1306C] text-xl mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-gray-300">Instagram</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareViaTelegram}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/20 transition-all duration-300 group"
              >
                <FaTelegram className="text-[#0088cc] text-xl mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-gray-300">Telegram</span>
              </motion.button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareViaWhatsapp}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 transition-all duration-300 group"
              >
                <FaWhatsapp className="text-[#25D366] text-xl mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-gray-300">WhatsApp</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareViaEmail}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#D44638]/10 hover:bg-[#D44638]/20 border border-[#D44638]/20 transition-all duration-300 group"
              >
                <FaEnvelope className="text-[#D44638] text-xl mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-gray-300">Email</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyLink}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#20DDBB]/10 hover:bg-[#20DDBB]/20 border border-[#20DDBB]/20 transition-all duration-300 group"
              >
                <FaLink className="text-[#20DDBB] text-xl mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-gray-300">{copyLinkText}</span>
              </motion.button>
            </div>
            
            {/* Copy link button */}
            <motion.button
              whileHover={{ scale: 1.03, backgroundColor: 'rgba(32, 221, 187, 0.9)' }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCopyLink}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#20DDBB] to-[#20DDBB]/90 text-white font-medium shadow-lg shadow-[#20DDBB]/20 flex items-center justify-center"
            >
              <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
              Copy Link to Clipboard
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareVibeModal; 