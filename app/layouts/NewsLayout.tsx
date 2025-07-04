import React, { useState, useEffect } from 'react';
import TopNav from "./includes/TopNav"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from "@/app/context/user";
import Head from 'next/head';
import NewsAdBanner from '../components/ads/NewsAdBanner';

// Login prompt modal component
const LoginPromptModal = ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => (
    <AnimatePresence>
        {isVisible && (
            <motion.div 
                className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div 
                    className="bg-[#1E2136] rounded-xl w-full max-w-md p-6 shadow-xl"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-xl font-bold text-white mb-3">Welcome to News</h3>
                    <p className="text-gray-300 mb-4">Sign in to get full access to our news, features, and community.</p>
                    
                    <div className="flex gap-4 mt-6">
                        <motion.button 
                            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg flex-1 transition-colors"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => window.location.href = '/login'}
                        >
                            Log in
                        </motion.button>
                        <motion.button 
                            className="border border-purple-600 text-purple-500 hover:bg-purple-600/10 py-2 px-4 rounded-lg flex-1 transition-colors"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => window.location.href = '/register'}
                        >
                            Sign up
                        </motion.button>
                    </div>
                    
                    <motion.button 
                        className="mt-4 text-gray-400 hover:text-white text-sm mx-auto block"
                        onClick={onClose}
                        whileHover={{ scale: 1.05 }}
                    >
                        Continue browsing
                    </motion.button>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

export default function NewsLayout({ children, title = "Latest News", description = "Stay updated with the latest news, updates, and announcements from our team." }: { 
    children: React.ReactNode; 
    title?: string;
    description?: string;
}) {
    const pathname = usePathname()
    const userContext = useUser();   
    
    // Modal state for login prompt
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Page transition variants
    const pageVariants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.5 } },
        exit: { opacity: 0, transition: { duration: 0.3 } }
    };

    useEffect(() => {
        // Show login modal to non-logged in users after a short delay
            if (!userContext?.user) {
            const timer = setTimeout(() => {
                setIsModalVisible(true);
            }, 3000);
            return () => clearTimeout(timer);
            }
    }, [userContext]);

    return (
		<>
            <Head>
                <title>{title} | SacralTrack</title>
                <meta name="description" content={description} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content="SacralTrack" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="canonical" href={`https://sacraltrack.space${pathname}`} />
                {/* Structured data for News Article - this improves SEO for news content */}
                <script type="application/ld+json">{`
                {
                    "@context": "https://schema.org",
                    "@type": "NewsArticle",
                    "headline": "${title}",
                    "description": "${description}",
                    "image": "https://sacraltrack.space/images/log.png",
                    "datePublished": "${new Date().toISOString()}",
                    "publisher": {
                        "@type": "Organization",
                        "name": "SacralTrack",
                        "logo": {
                            "@type": "ImageObject",
                            "url": "https://sacraltrack.space/images/log.png"
                        }
                    }
                }
                `}</script>
            </Head>
                
            <div className="min-h-screen bg-[#121324]">
		     <TopNav params={{ id: userContext?.user?.id as string }} />

                <div className="pb-16 content-with-top-nav">
			<motion.div
                        initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                        className="w-full"
            >
                    {/* Main Content Layout */}
                    <div className="w-full">
                        {/* Main content area */}
                        <div className="w-full">
                            {children}
                        </div>
                    </div>
			</motion.div>
			</div>

                {/* Login prompt modal */}
                <LoginPromptModal 
                    isVisible={isModalVisible} 
                    onClose={() => setIsModalVisible(false)} 
                />
		</div>
	</>
    )
}


