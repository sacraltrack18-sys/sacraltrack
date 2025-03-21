import { useState } from 'react';
import { Client, Databases } from 'appwrite';

/**
 * Hook to fetch likes for a post
 * @param postId - The ID of the post to fetch likes for
 * @param userId - Optional user ID to check if the user has liked the post
 * @returns Object containing like count, isLiked status, and loading state
 */
const useGetLikes = (postId?: string, userId?: string) => {
    const [likeCount, setLikeCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch likes for a post
     */
    const fetchLikes = async () => {
        if (!postId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const client = new Client()
                .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL as string)
                .setProject(process.env.NEXT_PUBLIC_ENDPOINT as string);
                
            const databases = new Databases(client);
            
            // Get all likes for this post
            const response = await databases.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID as string,
                process.env.NEXT_PUBLIC_COLLECTION_ID_LIKE as string,
                [`post_id=${postId}`]
            );
            
            setLikeCount(response.total);
            
            // Check if current user has liked this post
            if (userId) {
                const userLiked = response.documents.some(doc => doc.user_id === userId);
                setIsLiked(userLiked);
            }
        } catch (err) {
            console.error("Error fetching likes:", err);
            setError("Failed to fetch likes");
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Check if a user has liked a post
     */
    const checkUserLike = async () => {
        if (!postId || !userId) {
            return false;
        }

        try {
            const client = new Client()
                .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL as string)
                .setProject(process.env.NEXT_PUBLIC_ENDPOINT as string);
                
            const databases = new Databases(client);
            
            // Check if user has already liked this post
            const response = await databases.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID as string,
                process.env.NEXT_PUBLIC_COLLECTION_ID_LIKE as string,
                [
                    `user_id=${userId}`,
                    `post_id=${postId}`
                ]
            );
            
            return response.documents.length > 0;
        } catch (error) {
            console.error('Error checking like status:', error);
            return false;
        }
    };

    return {
        likeCount,
        isLiked,
        isLoading,
        error,
        fetchLikes,
        checkUserLike
    };
};

export default useGetLikes; 