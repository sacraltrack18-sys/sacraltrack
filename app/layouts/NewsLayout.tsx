import React, { useState, useEffect } from 'react';
import TopNav from "./includes/TopNav"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from "@/app/context/user";
import Head from 'next/head';

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
                <link rel="canonical" href={`https://sacraltrack.com${pathname}`} />
                {/* Structured data for News Article - this improves SEO for news content */}
                <script type="application/ld+json">{`
                {
                    "@context": "https://schema.org",
                    "@type": "NewsArticle",
                    "headline": "${title}",
                    "description": "${description}",
                    "image": "https://sacraltrack.com/images/log.png",
                    "datePublished": "${new Date().toISOString()}",
                    "publisher": {
                        "@type": "Organization",
                        "name": "SacralTrack",
                        "logo": {
                            "@type": "ImageObject",
                            "url": "https://sacraltrack.com/images/log.png"
                        }
                    }
                }
                `}</script>
            </Head>
                
            <div className="min-h-screen bg-[#121324]">
		     <TopNav params={{ id: userContext?.user?.id as string }} />

                <div className="pt-24 pb-16">
			<motion.div
                        initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                        className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8"
            >
				{children}
			</motion.div>
			</div>

                {/* Support Button */}
                <motion.a
                            href="http://t.me/sashaplayra"
                            target="_blank"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="fixed bottom-5 right-5 bg-[#272B43] text-white rounded-full w-16 h-16 flex items-center justify-center cursor-pointer hover:bg-[#1E2136] focus:outline-none z-40 shadow-lg shadow-purple-500/20"
                >   
                    <div className="flex flex-col items-center">
                                <img src="/images/tel.svg" className="w-4 h-4 mb-1" alt="" />
                                <span className="text-[10px]">Support</span>
                            </div>
                </motion.a>

                {/* Login prompt modal */}
                <LoginPromptModal 
                    isVisible={isModalVisible} 
                    onClose={() => setIsModalVisible(false)} 
                />
		</div>
	</>
    )
}


