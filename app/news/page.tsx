"use client";
import { useEffect, useState } from "react";
import NewsLayout from "../layouts/NewsLayout";
import NewsCard from "../components/news/NewsCard";
import NewsCardSkeleton from "../components/news/NewsCardSkeleton";
import { useNewsStore } from "@/app/stores/newsStore";
import ClientOnly from "../components/ClientOnly";
import { motion } from "framer-motion";

export default function News() {
    const { allNews, setAllNews, isLoading, error } = useNewsStore();
    const [searchQuery, setSearchQuery] = useState("");
    
    // Filtered news based on search query
    const filteredNews = allNews.filter((news) => 
        news.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        news.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const fetchNews = async () => {
            try {
                await setAllNews();
            } catch (error) {
                console.error("Error fetching news:", error);
            }
        };

        fetchNews();
    }, [setAllNews]);

    // Container animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <NewsLayout 
            title="Latest News & Updates" 
            description="Stay updated with the latest news, updates, and announcements from SacralTrack."
        >
            <div className="w-full max-w-6xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 text-center"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Latest News</h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">Stay updated with the latest news, updates, and announcements from our team.</p>
                </motion.div>
                
                {/* Search Bar */}
                <motion.div 
                    className="mb-10 max-w-md mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="relative flex items-center">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5 text-gray-400 absolute left-4" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search news..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#272B43] border border-[#3A3F5A] rounded-full py-3 px-5 pl-12 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
                        />
                    </div>
                </motion.div>
                
                <motion.div 
                    className="w-full"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <ClientOnly>
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[...Array(6)].map((_, index) => (
                                    <NewsCardSkeleton key={index} />
                                ))}
                            </div>
                        ) : error ? (
                            <motion.div 
                                className="bg-red-900/30 border border-red-500 text-white p-4 rounded-lg"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <p className="font-medium">Error loading news</p>
                                <p className="text-sm text-gray-300">{error}</p>
                                <button 
                                    className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
                                    onClick={() => setAllNews()}
                                >
                                    Try Again
                                </button>
                            </motion.div>
                        ) : filteredNews.length === 0 ? (
                            <motion.div 
                                className="text-center py-12"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className="h-16 w-16 mx-auto text-gray-600 mb-4" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-5M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
                                </svg>
                                {searchQuery ? (
                                    <>
                                        <p className="text-xl font-semibold text-white mb-2">No results found</p>
                                        <p className="text-gray-400">No news matching "{searchQuery}"</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xl font-semibold text-white mb-2">No news available</p>
                                        <p className="text-gray-400">Check back later for updates</p>
                                    </>
                                )}
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {filteredNews.map((news) => (
                                    <motion.div
                                        key={news.postid}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        layout
                                    >
                                        <NewsCard 
                                            news={news} 
                                            navigateOnClick={false} // Explicitly set to use popup only
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </ClientOnly>
                </motion.div>
            </div>
        </NewsLayout>
    );
}
