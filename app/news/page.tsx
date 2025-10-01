"use client";
import { useEffect, useState } from "react";
import NewsLayout from "../layouts/NewsLayout";
import NewsCard from "../components/news/NewsCard";
import NewsCardSkeleton from "../components/news/NewsCardSkeleton";
import { useNewsStore } from "@/app/stores/newsStore";
import ClientOnly from "../components/ClientOnly";
import { motion } from "framer-motion";
import BannerSlider from "../components/news/BannerSlider";
import NewsAdBanner from "../components/ads/NewsAdBanner";
import Head from 'next/head';

export default function News() {
    const { allNews, setAllNews, isLoading, error } = useNewsStore();

    // SEO metadata
    const pageTitle = "Music News | SacralTrack - Latest Music Industry Updates";
    const pageDescription = "Stay updated with the latest music news, artist updates, and industry insights on SacralTrack. Discover trending music stories and exclusive content.";
    const pageUrl = "https://sacraltrack.com/news";
    const pageImage = "https://sacraltrack.com/news-og-image.jpg";

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
        <>
            <Head>
                <title>Latest News & Updates | SacralTrack - Music News & Industry Updates</title>
                <meta name="description" content="Stay updated with the latest music news, industry updates, and announcements from SacralTrack. Discover trending topics, new releases, and exclusive content." />
                <meta name="keywords" content="music news, industry updates, SacralTrack news, music trends, new releases, music industry, electronic music news, artist updates, music stories" />
                <meta name="author" content="SacralTrack" />
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                <meta name="googlebot" content="index, follow" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta property="og:title" content="Latest News & Updates | SacralTrack" />
                <meta property="og:description" content="Stay updated with the latest music news, industry updates, and announcements from SacralTrack." />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://sacraltrack.com/news" />
                <meta property="og:image" content="https://sacraltrack.com/images/news-og-image.jpg" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Latest News & Updates | SacralTrack" />
                <meta name="twitter:description" content="Stay updated with the latest music news, industry updates, and announcements from SacralTrack." />
                <meta name="twitter:image" content="https://sacraltrack.com/images/news-og-image.jpg" />
                <link rel="canonical" href="https://sacraltrack.com/news" />
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "NewsArticle",
                        "headline": "Latest News & Updates from SacralTrack",
                        "description": "Stay updated with the latest music news, industry updates, and announcements from SacralTrack.",
                        "publisher": {
                            "@type": "Organization",
                            "name": "SacralTrack",
                            "logo": {
                                "@type": "ImageObject",
                                "url": "https://sacraltrack.com/logo.png"
                            }
                        },
                        "mainEntityOfPage": {
                            "@type": "WebPage",
                            "@id": "https://sacraltrack.com/news"
                        }
                    })}
                </script>
            </Head>
            <NewsLayout
                title="Latest News & Updates"
                description="Stay updated with the latest news, updates, and announcements from SacralTrack."
            >
            {/* Main Banner - Full Width with 30px margins on desktop, 10px on mobile */}
            <div className="w-full mb-8 px-[10px] lg:px-[30px]">
                <ClientOnly>
                    <BannerSlider />
                </ClientOnly>
            </div>

            {/* Content Area with Sidebar */}
            <div className="w-full px-[10px] md:px-6 lg:px-8">
                <div className="flex gap-8">
                    {/* Main Content */}
                    <main className="flex-1" role="main" aria-label="News articles"
                          itemScope itemType="https://schema.org/CollectionPage">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 text-center"
                        >
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Latest News</h1>
                            <p className="text-gray-400 max-w-2xl mx-auto">Stay updated with the latest news, updates, and announcements from our team.</p>
                        </motion.div>

                        {/* News Content */}
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
                                ) : allNews.length === 0 ? (
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
                                        <p className="text-xl font-semibold text-white mb-2">No news available</p>
                                        <p className="text-gray-400">Check back later for updates</p>
                                    </motion.div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {allNews.map((news) => (
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
                    </main>

                    {/* Right Sidebar - 300px width */}
                    <aside className="hidden lg:block w-[300px] flex-shrink-0" role="complementary" aria-label="News sidebar">
                        <div className="sticky top-24 space-y-6">
                            {/* AdsTerra Banner */}
                            <ClientOnly>
                                <NewsAdBanner
                                    className="w-full"
                                />
                            </ClientOnly>

                            {/* Trending Topics */}
                            <motion.div
                                className="bg-[#1A1D2E]/60 backdrop-blur-sm rounded-lg border border-white/10 p-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                    Trending Topics
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full group-hover:bg-purple-300"></div>
                                        <span className="text-gray-300 text-xs group-hover:text-white transition-colors">#SacralTrack</span>
                                        <span className="text-gray-500 text-xs ml-auto">1.2k</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full group-hover:bg-blue-300"></div>
                                        <span className="text-gray-300 text-xs group-hover:text-white transition-colors">#MusicNews</span>
                                        <span className="text-gray-500 text-xs ml-auto">856</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full group-hover:bg-green-300"></div>
                                        <span className="text-gray-300 text-xs group-hover:text-white transition-colors">#TechUpdates</span>
                                        <span className="text-gray-500 text-xs ml-auto">642</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full group-hover:bg-yellow-300"></div>
                                        <span className="text-gray-300 text-xs group-hover:text-white transition-colors">#NewReleases</span>
                                        <span className="text-gray-500 text-xs ml-auto">423</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Follow Us */}
                            <motion.div
                                className="bg-[#1A1D2E]/60 backdrop-blur-sm rounded-lg border border-white/10 p-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
                                    Follow Us
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <a href="https://www.youtube.com/@sacraltrack" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 transition-colors group">
                                        <svg className="w-4 h-4 text-red-400 group-hover:text-red-300" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                        </svg>
                                        <span className="text-xs text-gray-300 group-hover:text-white">YouTube</span>
                                    </a>
                                    <a href="https://www.facebook.com/sacraltrack" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 transition-colors group">
                                        <svg className="w-4 h-4 text-blue-400 group-hover:text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                        </svg>
                                        <span className="text-xs text-gray-300 group-hover:text-white">Facebook</span>
                                    </a>
                                </div>
                            </motion.div>
                        </div>
                    </aside>

                </div>
            </div>

            {/* Mobile Ad Banner - показывается только на мобильных */}
            <div className="lg:hidden mb-6 px-[10px]">
                <ClientOnly>
                    <NewsAdBanner
                        isMobile={true}
                        className="w-full"
                    />
                </ClientOnly>
            </div>
        </NewsLayout>
        </>
    );
}
