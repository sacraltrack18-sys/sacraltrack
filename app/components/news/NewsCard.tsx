import React, { useState } from 'react';
import { NewsItem } from '@/app/stores/newsStore';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useUser } from '@/app/context/user';
import { database, ID, Query, Permission } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';
import useGetNewsLikes from '@/app/hooks/useGetNewsLikes';
import Link from 'next/link';

interface NewsCardProps {
    news: NewsItem;
    navigateOnClick?: boolean; // Default to false, only navigate if explicitly set to true
}

const NewsCard: React.FC<NewsCardProps> = ({ news, navigateOnClick = false }) => {
    // Handle potential undefined values
    const title = news.name || "Untitled News";
    const description = news.description || "No description available";
    const { img_url, author, likes: initialLikes, created, $id } = news;
    
    // User context for authentication
    const  user  = useUser();
    
    // States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(initialLikes || 0);
    const [isLikeProcessing, setIsLikeProcessing] = useState(false);
    const [isModalLoading, setIsModalLoading] = useState(true);  // Add loading state for modal content
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);  // State for share modal
    
    // Format date
    const formattedDate = created ? new Date(created).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }) : 'Unknown date';
    
    // Placeholder image if img_url is missing
    const imageUrl = img_url || '/images/placeholders/news-placeholder.svg';
    const fallbackImageUrl = '/images/placeholders/news-placeholder.svg';
    
    // Check if user has liked this news
    React.useEffect(() => {
        if (user && $id) {
            checkUserLike();
        }
    }, [user, $id]);
    
    // Function to check if user has liked this post
    const checkUserLike = async () => {
        if (!user?.id) return;
        
        const dbId = process.env.NEXT_PUBLIC_DATABASE_ID;
        const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE;
        
        try {
            // Check if user has already liked this news using centralized database client
            const response = await database.listDocuments(
                dbId as string,
                collectionId as string,
                [
                    Query.equal("user_id", user.id as string),
                    Query.equal("news_id", $id)
                ]
            );
            
            if (response.documents.length > 0) {
                setIsLiked(true);
            }
        } catch (error: any) {
            console.error('Error checking like status:', error);
            // Don't show error toast for checking since it's a background operation
            // but log details for debugging
            if (error.message && error.message.includes('Collection with the requested ID could not be found')) {
                console.warn('The news likes collection does not exist: ' + collectionId);
            } else if (error.message && error.message.includes('not authorized')) {
                console.warn('Ошибка прав доступа: В коллекции news_like нужно настроить разрешения для чтения документов.');
            }
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
        
        const dbId = process.env.NEXT_PUBLIC_DATABASE_ID;
        const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE;
        
        // Debug information
        console.log('Using database ID:', dbId);
        console.log('Using collection ID:', collectionId);
        console.log('Current user ID:', user.id);
        
        try {
            if (!isLiked) {
                // Add like using centralized database client
                await database.createDocument(
                    dbId as string,
                    collectionId as string,
                    ID.unique(),
                    {
                        post_id: $id,
                        user_id: user.id,
                        news_id: $id,
                        created_at: new Date().toISOString()
                    },
                    // Use permission to ensure document can be created by the current user
                    // and read by the current user
                    [
                        Permission.read("user:" + user.id),
                        Permission.update("user:" + user.id),
                        Permission.delete("user:" + user.id)
                    ]
                );
                
                setLikeCount((prev) => prev + 1);
                setIsLiked(true);
                toast.success('Added to liked news!');
            } else {
                // Remove like using centralized database client
                const response = await database.listDocuments(
                    dbId as string,
                    collectionId as string,
                    [
                        Query.equal("user_id", user.id as string),
                        Query.equal("news_id", $id)
                    ]
                );
                
                if (response.documents.length > 0) {
                    await database.deleteDocument(
                        dbId as string,
                        collectionId as string,
                        response.documents[0].$id
                    );
                }
                
                setLikeCount((prev) => prev - 1);
                setIsLiked(false);
                toast.success('Removed from liked news');
            }
        } catch (error: any) {
            console.error('Error liking/unliking news:', error);
            
            // More detailed error message to help with debugging
            if (error.message && error.message.includes('Collection with the requested ID could not be found')) {
                toast.error('The news likes collection does not exist. Please create it in your Appwrite dashboard with ID: ' + collectionId);
            } else if (error.message && error.message.includes('not authorized')) {
                toast.error('У коллекции неправильные настройки прав доступа. Пожалуйста, настройте разрешения в панели Appwrite.');
                console.error('Правка для администратора: В коллекции news_like нужно настроить разрешения для создания документов пользователями.');
            } else {
                toast.error(`Error: ${error.message || 'Unknown error occurred'}`);
            }
        } finally {
            setIsLikeProcessing(false);
        }
    };
    
    // Function to handle share
    const handleShare = () => {
        setIsShareModalOpen(true);
    };
    
    // Fallback share method (copy to clipboard)
    const fallbackShare = () => {
        const url = `${window.location.origin}/news/${$id}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
    };
    
    // Function to share in specific social network
    const shareToSocialMedia = (network: string) => {
        const url = encodeURIComponent(`${window.location.origin}/news/${$id}`);
        const titleEncoded = encodeURIComponent(title);
        const descriptionEncoded = encodeURIComponent(description.substring(0, 100) + '...');
        let shareUrl = '';
        
        switch(network) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${titleEncoded}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${url}&text=${titleEncoded}`;
                break;
            case 'whatsapp':
                shareUrl = `https://api.whatsapp.com/send?text=${titleEncoded}%20${url}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
                break;
            case 'pinterest':
                shareUrl = `https://pinterest.com/pin/create/button/?url=${url}&description=${titleEncoded}&media=${encodeURIComponent(imageUrl)}`;
                break;
            default:
                fallbackShare();
                return;
        }
        
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
        setIsShareModalOpen(false);
        toast.success(`Shared to ${network.charAt(0).toUpperCase() + network.slice(1)}`);
    };
    
    // Function to handle card click
    const handleCardClick = () => {
        if (navigateOnClick) {
            // Use client-side navigation to the individual news page
            window.location.href = `/news/${$id}`;
        } else {
            // Open the modal
            setIsModalOpen(true);
            // Simulate loading (for demonstration)
            setIsModalLoading(true);
            setTimeout(() => {
                setIsModalLoading(false);
            }, 1000);
        }
    };
    
    return (
        <>
            <motion.div 
                className="bg-[#1E2136] rounded-xl overflow-hidden shadow-lg mb-6 w-full transition-all duration-300 hover:shadow-purple-500/20 cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -5 }}
                onClick={() => handleCardClick()}
            >
                <div className="relative overflow-hidden h-48">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1E2136]/70 z-10" />
                    
                    {/* Image with fallback */}
                    <div className="relative h-full w-full bg-[#272B43]">
                        <Image 
                            src={imageUrl}
                            alt={title}
                            fill
                            style={{ objectFit: 'cover' }}
                            className="transition-transform duration-700 hover:scale-110"
                            onError={(e) => {
                                // Fallback to placeholder on error
                                (e.target as HTMLImageElement).src = fallbackImageUrl;
                            }}
                            priority
                        />
                        
                        {/* Likes indicator */}
                        <div 
                            className="absolute top-4 right-4 z-20 flex items-center bg-purple-600/80 px-2 py-1 rounded-full backdrop-blur-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12.585l-4.243-4.242a3 3 0 114.243-4.243 3 3 0 014.243 4.243L10 12.586z" fillRule="evenodd" clipRule="evenodd" />
                            </svg>
                            <span className="text-white ml-1 text-xs">{likeCount}</span>
                        </div>
                    </div>
                </div>
                
                <div className="px-5 py-4">
                    <div className="flex items-center mb-2 text-xs text-gray-400">
                        <span>{formattedDate}</span>
                        {author && (
                            <>
                                <span className="mx-2">•</span>
                                <span>{author}</span>
                            </>
                        )}
                    </div>
                    
                    <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 leading-tight">
                        {title}
                    </h3>
                    
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                        {description}
                    </p>
                    
                    <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <motion.button
                            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsModalOpen(true);
                                setIsModalLoading(true);
                                setTimeout(() => setIsModalLoading(false), 1000);
                            }}
                        >
                            Read more
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </motion.button>
                        
                        <div className="flex space-x-2">
                            <motion.button
                                className={`flex items-center justify-center p-2 rounded-full ${isLiked ? 'bg-purple-600 text-white' : 'bg-[#272B43] text-gray-400 hover:text-white'}`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleLike();
                                }}
                                disabled={isLikeProcessing}
                            >
                                {isLikeProcessing ? (
                                    <div className="w-5 h-5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isLiked ? 0 : 2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                )}
                            </motion.button>
                            
                            <motion.button
                                className="flex items-center justify-center p-2 rounded-full bg-[#272B43] text-gray-400 hover:text-white"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShare();
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
            
            {/* News reading modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div 
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto" 
                        onClick={() => setIsModalOpen(false)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            className="bg-[#1E2136] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        >
                            <div className="relative h-64 sm:h-96">
                                <Image 
                                    src={imageUrl}
                                    alt={title}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    className="w-full"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = fallbackImageUrl;
                                    }}
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1E2136]/90" />
                                
                                <button 
                                    className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 backdrop-blur-sm transition-all"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                
                                <div className="absolute bottom-6 left-6 right-6">
                                    <h1 className="text-white font-bold text-2xl md:text-3xl mb-2 drop-shadow-lg">
                                        {title}
                                    </h1>
                                    <div className="flex items-center text-sm text-gray-200">
                                        <span>{formattedDate}</span>
                                        {author && (
                                            <>
                                                <span className="mx-2">•</span>
                                                <span>{author}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-24rem)]">
                                {isModalLoading ? (
                                    <div className="animate-pulse space-y-4">
                                        {/* Description placeholder */}
                                        <div className="h-4 bg-[#272B43] rounded w-full"></div>
                                        <div className="h-4 bg-[#272B43] rounded w-5/6"></div>
                                        <div className="h-4 bg-[#272B43] rounded w-full"></div>
                                        <div className="h-4 bg-[#272B43] rounded w-4/5"></div>
                                        
                                        {/* More content placeholder */}
                                        <div className="h-4 bg-[#272B43] rounded w-full mt-8"></div>
                                        <div className="h-4 bg-[#272B43] rounded w-5/6"></div>
                                        <div className="h-4 bg-[#272B43] rounded w-full"></div>
                                        
                                        {/* Footer placeholder */}
                                        <div className="mt-8 pt-6 border-t border-gray-700 flex justify-between items-center">
                                            <div className="h-8 bg-[#272B43] rounded w-20"></div>
                                            <div className="h-8 bg-[#272B43] rounded w-20"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-gray-300 space-y-4">
                                            <p>{description}</p>
                                            
                                            {/* If there's more content in the news, display it here */}
                                            {/* For now, duplicate description as placeholder */}
                                            <p>{description}</p>
                                            <p>{description}</p>
                                        </div>
                                        
                                        <div className="mt-8 pt-6 border-t border-gray-700 flex justify-between items-center">
                                            <motion.button
                                                className={`flex items-center ${isLiked ? 'text-purple-400' : 'text-gray-400 hover:text-white'} transition-all`}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleLike}
                                                disabled={isLikeProcessing}
                                            >
                                                {isLikeProcessing ? (
                                                    <div className="w-5 h-5 mr-2 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isLiked ? 0 : 2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                    </svg>
                                                )}
                                                {isLiked ? 'Liked' : 'Like'}
                                            </motion.button>
                                            
                                            <motion.button
                                                className="text-gray-400 hover:text-white flex items-center transition-all"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleShare}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                </svg>
                                                Share
                                            </motion.button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Share Modal */}
            <AnimatePresence>
                {isShareModalOpen && (
                    <motion.div 
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setIsShareModalOpen(false)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            className="bg-[#1E2136] rounded-xl w-full max-w-md p-6 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Share this news</h3>
                                <button 
                                    className="text-gray-400 hover:text-white"
                                    onClick={() => setIsShareModalOpen(false)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                {/* Facebook */}
                                <motion.button
                                    className="flex flex-col items-center p-3 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 rounded-xl text-white"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => shareToSocialMedia('facebook')}
                                >
                                    <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center mb-2">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm">Facebook</span>
                                </motion.button>
                                
                                {/* Twitter */}
                                <motion.button
                                    className="flex flex-col items-center p-3 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 rounded-xl text-white"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => shareToSocialMedia('twitter')}
                                >
                                    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center mb-2">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm">X</span>
                                </motion.button>
                                
                                {/* Telegram */}
                                <motion.button
                                    className="flex flex-col items-center p-3 bg-[#0088CC]/10 hover:bg-[#0088CC]/20 rounded-xl text-white"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => shareToSocialMedia('telegram')}
                                >
                                    <div className="w-12 h-12 rounded-full bg-[#0088CC] flex items-center justify-center mb-2">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-1.28-.67-2.02-1.08-3.26-1.74-1.44-.76-.5-1.18.31-1.86.21-.18 3.86-3.54 3.93-3.84.01-.04.01-.19-.08-.27-.09-.08-.21-.05-.3-.03-.13.03-2.19 1.38-6.18 4.06-.58.4-1.11.6-1.57.58-.52-.02-1.5-.29-2.23-.54-.9-.3-1.62-.46-1.55-1 .03-.25.35-.49.95-.71 3.73-1.64 6.22-2.72 7.46-3.24 3.56-1.52 4.3-1.78 4.78-1.79.11 0 .35.03.5.13.13.09.17.2.19.3.02.14 0 .29 0 .33z"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm">Telegram</span>
                                </motion.button>
                                
                                {/* WhatsApp */}
                                <motion.button
                                    className="flex flex-col items-center p-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 rounded-xl text-white"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => shareToSocialMedia('whatsapp')}
                                >
                                    <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center mb-2">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.241-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.365-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345m-5.446 7.443h-.016c-1.77 0-3.524-.48-5.055-1.38l-.36-.214-3.75.975 1.005-3.645-.239-.375c-.99-1.576-1.516-3.391-1.516-5.26 0-5.445 4.455-9.885 9.942-9.885 2.654 0 5.145 1.035 7.021 2.91 1.875 1.859 2.909 4.35 2.909 6.99-.004 5.444-4.46 9.885-9.935 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm">WhatsApp</span>
                                </motion.button>
                                
                                {/* LinkedIn */}
                                <motion.button
                                    className="flex flex-col items-center p-3 bg-[#0077B5]/10 hover:bg-[#0077B5]/20 rounded-xl text-white"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => shareToSocialMedia('linkedin')}
                                >
                                    <div className="w-12 h-12 rounded-full bg-[#0077B5] flex items-center justify-center mb-2">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm">LinkedIn</span>
                                </motion.button>
                                
                                {/* Pinterest */}
                                <motion.button
                                    className="flex flex-col items-center p-3 bg-[#E60023]/10 hover:bg-[#E60023]/20 rounded-xl text-white"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => shareToSocialMedia('pinterest')}
                                >
                                    <div className="w-12 h-12 rounded-full bg-[#E60023] flex items-center justify-center mb-2">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm">Pinterest</span>
                                </motion.button>
                            </div>
                            
                            {/* Copy Link Button */}
                            <motion.button
                                className="w-full flex items-center justify-center p-3 mt-4 bg-[#272B43] hover:bg-[#20183D] rounded-xl text-white"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    fallbackShare();
                                    setIsShareModalOpen(false);
                                }}
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                Copy Link
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default NewsCard;

