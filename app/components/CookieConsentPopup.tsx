"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOCALSTORAGE_KEY = "cookie_consent";

export default function CookieConsentPopup() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Показываем popup через 12 секунд, если не согласился ранее
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    if (localStorage.getItem(LOCALSTORAGE_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 12000);
    return () => clearTimeout(timer);
  }, []);

  // Закрытие и сохранение выбора
  const handleChoice = useCallback((accepted: boolean) => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, accepted ? "accepted" : "declined");
    } catch {}
    setVisible(false);
  }, []);

  // Закрытие по Esc
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[999998] flex items-end justify-center sm:items-end sm:justify-end pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-md mx-auto mb-6 sm:mb-8 sm:mr-8 sm:w-[380px] bg-gradient-to-br from-white/20 to-[#1A1A2E]/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 sm:p-8 flex flex-col gap-4 pointer-events-auto glass-effect"
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.5 }}
            role="dialog"
            aria-modal="true"
            aria-label="Cookie consent dialog"
            tabIndex={-1}
          >
            {/* Glass фон */}
            <div className="absolute inset-0 -z-10 rounded-2xl overflow-hidden">
              <div className="absolute -inset-10 bg-[radial-gradient(circle_at_60%_40%,rgba(32,221,187,0.18),transparent_70%)] animate-pulse-slow" />
              <div className="absolute -inset-10 bg-[radial-gradient(circle_at_30%_70%,rgba(139,92,246,0.13),transparent_70%)] animate-pulse-slower" />
            </div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🍪</span>
              <h2 className="text-lg sm:text-xl font-semibold text-white drop-shadow-glow">We use cookies</h2>
            </div>
            <p className="text-white/80 text-sm sm:text-base">
              This website uses cookies to ensure you get the best experience. By clicking "Accept", you agree to our use of cookies. <a href="/terms" className="underline text-[#20DDBB] hover:text-[#8B5CF6] transition-colors" target="_blank" rel="noopener noreferrer">Learn more</a>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={() => handleChoice(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6] text-white font-medium shadow-glow text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#20DDBB] focus:ring-offset-2 transition-all hover:scale-105"
                autoFocus
                aria-label="Accept cookies"
              >
                Accept
              </button>
              <button
                onClick={() => handleChoice(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white/10 border border-white/30 text-white/80 font-medium text-sm sm:text-base hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 transition-all"
                aria-label="Decline cookies"
              >
                Decline
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 