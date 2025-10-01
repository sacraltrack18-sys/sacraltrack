import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsVinyl, BsStars } from 'react-icons/bs';
import { BellIcon, MusicalNoteIcon, UserCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import useDeviceDetect from '@/app/hooks/useDeviceDetect';

const NAV_GUIDE_KEY = 'topnav_guide_shown_v1';

const steps = [
  {
    id: 'intro',
    icon: <img src="/images/T-logo.svg" alt="Sacral Track Logo" className="w-8 h-8" />,
    label: 'Sacral Track',
    description: 'Music social network with marketplace for artists and music listeners. *beta mode.. we are fixing bugs. If something does not work, write to support, thank you for your participation in the Sacral Track evolution.',
    selector: '#TopNav',
    customPosition: (logoRect) => {
      if (!logoRect) return { top: 70, left: 24 };
      return {
        top: logoRect.top + 48,
        left: logoRect.left + 24,
      };
    },
  },
  {
    id: 'release',
    icon: <BsVinyl className="w-7 h-7 text-blue-400" />,
    label: 'Release',
    description: 'Upload your own music and share it with the world.',
    selector: '#release-button',
  },
  {
    id: 'vibe',
    icon: <BsStars className="w-7 h-7 text-purple-400" />,
    label: 'Vibe',
    description: 'Post short audio vibes, moods, or updates for your followers.',
    selector: '#vibe-button',
  },
  {
    id: 'notification',
    icon: <BellIcon className="w-7 h-7 text-amber-400" />,
    label: 'Notifications',
    description: 'Stay updated with new messages, likes, and system alerts.',
    selector: 'button[aria-label="Notifications"], .notification-bell',
  },
  {
    id: 'profile',
    icon: <UserCircleIcon className="w-7 h-7 text-[#20DDBB]" />,
    label: 'Profile',
    description: 'Access your profile, settings, and account options.',
    selector: '.profile-menu, [aria-label="Profile"]',
  },
];

const glassClass =
  'bg-[rgba(36,24,61,0.96)] backdrop-blur-xl border border-white/10 shadow-2xl rounded-[20px]';

const TopNavGuide: React.FC = () => {
  const { isMobile } = useDeviceDetect();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [positions, setPositions] = useState<any>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Detect if running on localhost
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      setIsLocalhost(host === 'localhost' || host === '127.0.0.1');
    }
  }, []);

  // Only show on first visit
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(NAV_GUIDE_KEY)) {
      setTimeout(() => setShow(true), 800); // slight delay for effect
    }
  }, []);

  // Save as shown
  useEffect(() => {
    if (show && typeof window !== 'undefined') {
      localStorage.setItem(NAV_GUIDE_KEY, '1');
    }
  }, [show]);

  // For desktop: calculate icon positions for floating tooltips
  useEffect(() => {
    if (!isMobile && show) {
      const newPositions: any = {};
      steps.forEach((s) => {
        if (s.customPosition) {
          // For the intro step, use custom position logic
          const nav = document.querySelector(s.selector);
          const rect = nav ? (nav as HTMLElement).getBoundingClientRect() : null;
          newPositions[s.id] = s.customPosition(rect);
        } else {
          const el = document.querySelector(s.selector);
          if (el) {
            const rect = (el as HTMLElement).getBoundingClientRect();
            newPositions[s.id] = {
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
              height: rect.height,
            };
          }
        }
      });
      setPositions(newPositions);
    }
  }, [show, isMobile]);

  // Keyboard navigation (desktop)
  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
      if (e.key === 'Escape') setShow(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [show]);

  // Auto-close after last step (mobile and desktop)
  useEffect(() => {
    if (show && step === steps.length - 1) {
      const timer = setTimeout(() => setShow(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [show, step]);

  // Auto-advance slides every 4 seconds (for both mobile and desktop)
  useEffect(() => {
    if (show && step < steps.length - 1) {
      const timer = setTimeout(() => setStep((s) => s + 1), 4000);
      return () => clearTimeout(timer);
    }
  }, [show, step]);

  // Listen for window resize to update tooltip position
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- MOBILE: Single modal with stepper ---
  if (isMobile && show) {
    return (
      <AnimatePresence>
        <motion.div
          key="mobile-guide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-lg"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className={`w-[90vw] max-w-[380px] p-6 rounded-2xl ${glassClass} relative`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-3">{steps[step].icon}</div>
              <div className="text-lg font-bold text-white mb-1">{steps[step].label}</div>
              <div className="text-white/80 text-sm mb-4 min-h-[48px]">{steps[step].description}</div>
              <div className="flex items-center justify-center gap-2 mb-4">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      i === step ? 'bg-[#20DDBB] scale-125' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
              <div className="flex w-full gap-2">
                <button
                  className="flex-1 py-2 rounded-xl bg-white/10 text-white/80 font-semibold hover:bg-white/20 transition"
                  onClick={() => setShow(false)}
                >
                  Skip
                </button>
                <button
                  className="flex-1 py-2 rounded-xl bg-[#20DDBB] text-black font-bold hover:bg-[#18bfa0] transition"
                  onClick={() =>
                    step < steps.length - 1 ? setStep(step + 1) : null
                  }
                  disabled={step === steps.length - 1}
                >
                  {step < steps.length - 1 ? 'Next' : 'Done'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // --- DESKTOP: Floating tooltip for current step ONLY ---
  if (!isMobile && show) {
    const s = steps[step];
    const pos = positions[s.id];
    // Tooltip size assumptions
    const tooltipWidth = 260;
    const tooltipHeight = 140;
    let top = pos ? (pos.top !== undefined ? pos.top : 100) : 100;
    let left = pos ? (pos.left !== undefined ? pos.left : 100) : 100;
    if (!s.customPosition && pos) {
      top = pos.top + pos.height + 12;
      left = pos.left + pos.width / 2 - tooltipWidth / 2;
    }
    // Special positioning for 3rd and 4th steps (vibe and notification)
    if ((s.id === 'vibe' || s.id === 'notification')) {
      left = windowWidth - tooltipWidth - 30;
      if (!pos) top = 100; // fallback if pos is missing
    }
    // Clamp to viewport
    if (typeof window !== 'undefined') {
      const maxLeft = windowWidth - tooltipWidth - 16;
      const minLeft = 16;
      left = Math.max(minLeft, Math.min(left, maxLeft));
      const maxTop = window.innerHeight - tooltipHeight - 16;
      top = Math.max(16, Math.min(top, maxTop));
    }
    return (
      <>
        <AnimatePresence>
          <>
            {/* Overlay */}
            <motion.div
              key="desktop-guide-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-lg"
              onClick={() => setShow(false)}
            />
            {/* Tooltip for current step ONLY */}
            {((s.id === 'vibe' || s.id === 'notification') || pos) && (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`fixed z-[100001] pointer-events-auto ${glassClass} px-5 py-4 min-w-[220px] max-w-[260px] shadow-2xl`}
                style={{
                  top,
                  left,
                  borderRadius: 20,
                  width: tooltipWidth,
                  maxWidth: '90vw',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {s.icon}
                  <span className="text-lg font-bold text-white">{s.label}</span>
                </div>
                <div className="text-white/80 text-sm mb-3">{s.description}</div>
                <div className="flex items-center gap-2 justify-between">
                  <button
                    className="text-xs text-white/60 hover:text-white px-2 py-1 rounded transition"
                    onClick={() => setShow(false)}
                  >
                    Skip
                  </button>
                  <div className="flex gap-1">
                    {steps.map((_, j) => (
                      <span
                        key={j}
                        className={`w-2 h-2 rounded-full transition-all duration-200 ${
                          j === step ? 'bg-[#20DDBB] scale-125' : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    className="text-xs text-[#20DDBB] hover:text-white px-2 py-1 rounded transition font-bold"
                    onClick={() =>
                      step < steps.length - 1 ? setStep(step + 1) : null
                    }
                    disabled={step === steps.length - 1}
                  >
                    {step < steps.length - 1 ? 'Next' : 'Done'}
                  </button>
                </div>
              </motion.div>
            )}
          </>
        </AnimatePresence>
      </>
    );
  }

  // If nothing to show, just render the test button if on localhost
  return null;
};

export default TopNavGuide; 