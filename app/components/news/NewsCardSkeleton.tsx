import React from 'react';
import { motion } from 'framer-motion';

const NewsCardSkeleton: React.FC = () => {
    return (
        <motion.div 
            className="bg-[#1E2136] rounded-xl overflow-hidden shadow-lg mb-6 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="animate-pulse">
                {/* Image placeholder */}
                <div className="relative h-48 bg-[#272B43]">
                    {/* Likes indicator placeholder */}
                    <div className="absolute top-4 right-4 bg-[#333753] rounded-full h-6 w-12"></div>
                </div>
                
                <div className="px-5 py-4">
                    {/* Date and author placeholder */}
                    <div className="flex items-center mb-2">
                        <div className="h-2 bg-[#272B43] rounded w-20 mr-3"></div>
                        <div className="h-2 bg-[#272B43] rounded w-24"></div>
                    </div>
                    
                    {/* Title placeholder */}
                    <div className="h-5 bg-[#272B43] rounded w-3/4 mb-2"></div>
                    <div className="h-5 bg-[#272B43] rounded w-1/2 mb-4"></div>
                    
                    {/* Description placeholder */}
                    <div className="h-3 bg-[#272B43] rounded w-full mb-2"></div>
                    <div className="h-3 bg-[#272B43] rounded w-5/6 mb-4"></div>
                    
                    {/* Actions placeholder */}
                    <div className="flex items-center justify-between">
                        <div className="h-8 bg-[#272B43] rounded w-1/3"></div>
                        <div className="flex space-x-2">
                            <div className="h-8 w-8 bg-[#272B43] rounded-full"></div>
                            <div className="h-8 w-8 bg-[#272B43] rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default NewsCardSkeleton; 