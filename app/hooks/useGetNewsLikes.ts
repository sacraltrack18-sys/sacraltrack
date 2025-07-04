import { Client, Databases, Query } from "appwrite";

/**
 * Custom hook for fetching news likes from the dedicated news_like collection
 * @param newsId The ID of the news to get likes for
 * @returns Promise with the number of likes and array of user IDs who liked the news
 */
export default async function useGetNewsLikes(newsId: string) {
    if (!newsId) return { likesCount: 0, userIds: [] };
    
    try {
        const client = new Client()
            .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL as string)
            .setProject(process.env.NEXT_PUBLIC_ENDPOINT as string);
            
        const databases = new Databases(client);
        
        // Get all likes for this news item
        const response = await databases.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID as string,
            process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE as string || '67db665e002906c5c567',
            [Query.equal("news_id", newsId)]
        );
        
        // Extract user IDs of people who liked this news
        const userIds = response.documents.map(doc => doc.user_id);
        
        return {
            likesCount: response.total,
            userIds
        };
    } catch (error) {
        console.error('Error fetching news likes:', error);
        return { likesCount: 0, userIds: [] };
    }
} 