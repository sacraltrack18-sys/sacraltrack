import React from 'react';
import { motion } from 'framer-motion';

const UserCardSkeleton = () => {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-[3/4] min-h-[360px] max-h-[480px] rounded-2xl relative overflow-hidden bg-[#1A1A2E]/50 border border-white/5 transform-gpu"
        >
            {/* Modern gradient background with mobile optimization */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E1A36]/80 to-[#2A2151]/80">
                <div className="absolute inset-0 bg-[#20DDBB]/5 mix-blend-overlay" />
            </div>
            
            {/* Mobile-optimized animated elements */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-6">
                {/* Profile image placeholder with improved mobile animation */}
                <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#20DDBB]/5 border border-[#20DDBB]/10 mb-4 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#20DDBB]/10 to-transparent animate-shimmer" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 text-[#20DDBB]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                </motion.div>

                {/* Name placeholder with mobile-friendly dimensions */}
                <div className="h-4 w-28 md:w-32 bg-gradient-to-r from-[#20DDBB]/20 via-[#20DDBB]/10 to-[#20DDBB]/20 rounded-md mb-2">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#20DDBB]/10 to-transparent animate-shimmer" />
                </div>

                {/* Stats placeholders with touch-friendly spacing */}
                <div className="flex items-center gap-4 md:gap-3 mt-2">
                    {/* Followers */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#20DDBB]/20" />
                        <div className="h-2 w-8 bg-[#20DDBB]/10 rounded" />
                    </div>
                    
                    {/* Likes */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#20DDBB]/20" />
                        <div className="h-2 w-8 bg-[#20DDBB]/10 rounded" />
                    </div>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#20DDBB]/20" />
                        <div className="h-2 w-8 bg-[#20DDBB]/10 rounded" />
                    </div>
                </div>

                {/* Mobile-optimized decorative elements */}
                <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-gradient-to-br from-[#20DDBB]/5 to-transparent rounded-full transform translate-x-12 -translate-y-12" />
                <div className="absolute bottom-0 left-0 w-20 md:w-24 h-20 md:h-24 bg-gradient-to-tr from-[#20DDBB]/5 to-transparent rounded-full transform -translate-x-8 translate-y-8" />
                
                {/* Optimized animated lines for mobile */}
                <div className="absolute inset-0">
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            transition={{ 
                                duration: 0.8, 
                                delay: i * 0.2,
                                ease: "easeInOut",
                                repeat: Infinity,
                                repeatType: "reverse"
                            }}
                            className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#20DDBB]/10 to-transparent"
                            style={{
                                top: `${30 + i * 20}%`,
                                transformOrigin: i % 2 === 0 ? "left" : "right"
                            }}
                        />
                    ))}
                </div>

                {/* Mobile loading indicator */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#20DDBB]/30 animate-pulse" style={{ animationDelay: "0s" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#20DDBB]/30 animate-pulse" style={{ animationDelay: "0.2s" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#20DDBB]/30 animate-pulse" style={{ animationDelay: "0.4s" }} />
                    </div>
                </div>
            </div>

            {/* Mobile touch ripple effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#20DDBB]/5 opacity-0 transition-opacity duration-300 touch-none pointer-events-none mobile-touch-ripple" />
        </motion.div>
    );
};

export default UserCardSkeleton; 