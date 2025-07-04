"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import NewsLayout from '@/app/layouts/NewsLayout';
import { Client, Databases } from 'appwrite';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useUser } from '@/app/context/user';
import { toast } from 'react-hot-toast';
import useGetLikes from '@/app/hooks/useGetLikes';
import { ID } from 'appwrite';
import Link from 'next/link';
import { recordFailedImageRequest, fixAppwriteImageUrl } from '@/app/utils/appwriteImageUrl';

export default function NewsDetail() {
    const params = useParams();
    const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";
    const user  = useUser();
    
    const [news, setNews] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isLikeProcessing, setIsLikeProcessing] = useState(false);
    
    // Fetch news details
    useEffect(() => {
        const fetchNewsDetails = async () => {
            if (!id) return;
            
            try {
                setIsLoading(true);
                setError(null);
                
                const client = new Client()
                    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL as string)
                    .setProject(process.env.NEXT_PUBLIC_ENDPOINT as string);
                    
                const databases = new Databases(client);
                
                // Get news by ID
                const response = await databases.getDocument(
                    process.env.NEXT_PUBLIC_DATABASE_ID as string,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS as string,
                    id as string
                );
                
                setNews(response);
                setLikeCount(response.likes || 0);
                
                // Check if user has liked this news
                if (user) {
                    checkUserLike();
                }
            } catch (err) {
                console.error("Error fetching news details:", err);
                setError("Failed to fetch news details");
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchNewsDetails();
    }, [id, user]);
    
    // Check if user has liked this news
    const checkUserLike = async () => {
        if (!user || !id) return;
        
        try {
            const client = new Client()
                .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL as string)
                .setProject(process.env.NEXT_PUBLIC_ENDPOINT as string);
                
            const databases = new Databases(client);
            
            // Check if user has already liked this news
            const response = await databases.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID as string,
                process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE as string || '67db665e002906c5c567',
                [
                    `user_id=${user.id}`,
                    `news_id=${id}`
                ]
            );
            
            if (response.documents.length > 0) {
                setIsLiked(true);
            }
        } catch (error) {
            console.error('Error checking like status:', error);
        }
    };
    
    // Function to handle like/unlike
    const handleLike = async () => {
        if (!user) {
            toast.error('Please log in to like news', {
                style: {
                    border: '1px solid #713200',
                    padding: '16px',
                    color: '#713200',
                },
                iconTheme: {
                    primary: '#713200',
                    secondary: '#FFFAEE',
                },
            });
            return;
        }
        
        if (isLikeProcessing) return;
        
        setIsLikeProcessing(true);
        
        try {
            const client = new Client()
                .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL as string)
                .setProject(process.env.NEXT_PUBLIC_ENDPOINT as string);
                
            const databases = new Databases(client);
            
            if (!isLiked) {
                // Add like
                await databases.createDocument(
                    process.env.NEXT_PUBLIC_DATABASE_ID as string,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE as string || '67db665e002906c5c567',
                    ID.unique(),
                    {
                        news_id: id,
                        user_id: user.id
                    }
                );
                
                setLikeCount((prev) => prev + 1);
                setIsLiked(true);
                toast.success('Added to liked news!');
            } else {
                // Remove like
                const response = await databases.listDocuments(
                    process.env.NEXT_PUBLIC_DATABASE_ID as string,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE as string || '67db665e002906c5c567',
                    [
                        `user_id=${user.id}`,
                        `news_id=${id}`
                    ]
                );

                if (response.documents.length > 0) {
                    await databases.deleteDocument(
                        process.env.NEXT_PUBLIC_DATABASE_ID as string,
                        process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE as string || '67db665e002906c5c567',
                        response.documents[0].$id
                    );
                }
                
                setLikeCount((prev) => prev - 1);
                setIsLiked(false);
                toast.success('Removed from liked news');
            }
        } catch (error) {
            console.error('Error liking/unliking news:', error);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsLikeProcessing(false);
        }
    };
    
    // Function to handle share
    const handleShare = async () => {
        const url = `${window.location.origin}/news/${id}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: news?.name || 'News article',
                    text: news?.description || 'Check out this news article',
                    url: url
                });
                toast.success('Shared successfully!');
            } catch (error) {
                console.error('Error sharing:', error);
                fallbackShare();
            }
        } else {
            fallbackShare();
        }
    };
    
    // Fallback share method (copy to clipboard)
    const fallbackShare = () => {
        const url = `${window.location.origin}/news/${id}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
    };
    
    // Handle placeholder image if img_url is missing
    const fallbackImageUrl = '/images/placeholders/news-placeholder.svg';
    const rawImageUrl = news?.img_url || fallbackImageUrl;
    // Fix the image URL if it has the problematic format
    const imageUrl = fixAppwriteImageUrl(rawImageUrl, fallbackImageUrl);
    
    // Format date
    const formattedDate = news?.created 
        ? new Date(news.created).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) 
        : 'Unknown date';
    
    if (isLoading) {
        return (
            <NewsLayout>
                <div className="w-full max-w-4xl mx-auto p-4">
                    <div className="animate-pulse">
                        <div className="h-64 bg-[#272B43] rounded-xl mb-8"></div>
                        <div className="h-8 bg-[#272B43] rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-[#272B43] rounded w-1/4 mb-8"></div>
                        <div className="h-4 bg-[#272B43] rounded w-full mb-3"></div>
                        <div className="h-4 bg-[#272B43] rounded w-full mb-3"></div>
                        <div className="h-4 bg-[#272B43] rounded w-3/4 mb-8"></div>
                    </div>
                </div>
            </NewsLayout>
        );
    }
    
    if (error || !news) {
        return (
            <NewsLayout>
                <div className="w-full max-w-4xl mx-auto p-4 text-center">
                    <motion.div 
                        className="bg-red-900/30 border border-red-500 text-white p-8 rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <h2 className="text-2xl font-bold mb-2">News Not Found</h2>
                        <p className="text-gray-300 mb-6">The news article you're looking for doesn't exist or has been removed.</p>
                        <Link href="/news" className="bg-purple-600 hover:bg-purple-700 transition-colors text-white font-medium py-2 px-6 rounded-lg inline-flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            Back to News
                        </Link>
                    </motion.div>
                </div>
            </NewsLayout>
        );
    }
    
    return (
        <NewsLayout
            title={news.name}
            description={news.description}
        >
            <div className="w-full max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href="/news" className="text-gray-400 hover:text-white inline-flex items-center transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to News
                    </Link>
                </div>
                
                <div className="bg-[#1E2136] rounded-xl overflow-hidden shadow-xl mb-8">
                    <div className="relative h-64 md:h-96">
                        <Image 
                            src={imageUrl}
                            alt={news.name}
                            fill
                            style={{ objectFit: 'cover' }}
                            className="w-full"
                            onError={(e) => {
                                // Check if max retries reached
                                const shouldUseDefaultImage = recordFailedImageRequest(imageUrl);
                                
                                // Always use fallback image on error to prevent infinite retries
                                (e.target as HTMLImageElement).src = fallbackImageUrl;
                            }}
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1E2136]/90" />
                        
                        <div className="absolute top-4 right-4 z-10 flex items-center bg-purple-600/80 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12.585l-4.243-4.242a3 3 0 114.243-4.243 3 3 0 014.243 4.243L10 12.586z" fillRule="evenodd" clipRule="evenodd" />
                            </svg>
                            <span className="text-white ml-1.5 text-sm">{likeCount}</span>
                        </div>
                    </div>
                    
                    <div className="p-6 md:p-8">
                        <div className="flex items-center mb-4 text-sm text-gray-400">
                            <span>{formattedDate}</span>
                            {news.author && (
                                <>
                                    <span className="mx-2">•</span>
                                    <span>{news.author}</span>
                                </>
                            )}
                        </div>
                        
                        <h1 className="text-white font-bold text-2xl md:text-4xl mb-6">
                            {news.name}
                        </h1>
                        
                        <div className="text-gray-300 space-y-6 mb-8 text-lg leading-relaxed">
                            <p>{news.description}</p>
                            
                            {/* Here you would render the full article content */}
                            {/* For now, just show the description repeatedly */}
                            <p>{news.description}</p>
                            <p>{news.description}</p>
                        </div>
                        
                        <div className="border-t border-gray-700 pt-6 flex justify-between items-center">
                            <motion.button
                                className={`flex items-center rounded-lg px-4 py-2 ${isLiked ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:text-white hover:bg-[#272B43]'} transition-all`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleLike}
                                disabled={isLikeProcessing}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isLiked ? 0 : 2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                {isLiked ? 'Liked' : 'Like'}
                            </motion.button>
                            
                            <motion.button
                                className="flex items-center rounded-lg px-4 py-2 text-gray-400 hover:text-white hover:bg-[#272B43] transition-all"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleShare}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                Share
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>
        </NewsLayout>
    );
} 