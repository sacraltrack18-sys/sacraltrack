import { database, Query } from "@/libs/AppWriteClient"

const useGetProfileByUserId = async (userId: string) => {
    try {
        console.log(`[DEBUG-HOOK] Fetching profile for user ID: ${userId}`);
        
        if (!userId) {
            console.warn('[DEBUG-HOOK] No userId provided');
            return {
                id: null,
                user_id: null,
                name: 'Unknown User',
                image: '/images/placeholders/user-placeholder.svg',
                bio: ''
            };
        }

        const response = await database.listDocuments(
            String(process.env.NEXT_PUBLIC_DATABASE_ID), 
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE), 
            [ 
                Query.equal('user_id', userId) 
            ]
        );
        
        const documents = response.documents;
        
        if (!documents || documents.length === 0) {
            console.warn(`[DEBUG-HOOK] No profile found for user ID: ${userId}`);
            return {
                id: null,
                user_id: userId,
                name: 'Unknown User',
                image: '/images/placeholders/user-placeholder.svg',
                bio: ''
            };
        }

        const doc = documents[0];
        return {
            id: doc?.$id,
            user_id: doc?.user_id,
            name: doc?.name || 'Unknown User',
            image: doc?.image || '/images/placeholders/user-placeholder.svg',
            bio: doc?.bio || '',
            genre: doc?.genre,
            location: doc?.location,
            website: doc?.website,
            role: doc?.role,
            social_links: doc?.social_links,
            total_likes: doc?.total_likes,
            total_followers: doc?.total_followers,
            average_rating: doc?.average_rating,
            total_ratings: doc?.total_ratings,
            display_name: doc?.display_name,
            banner_image: doc?.banner_image,
            verified: doc?.verified === "true"
        };
    } catch (error) {
        console.error(`[DEBUG-HOOK] Error fetching profile for user ID ${userId}:`, error);
        // Return default profile instead of throwing error
        return {
            id: null,
            user_id: userId,
            name: 'Unknown User',
            image: '/images/placeholders/user-placeholder.svg',
            bio: ''
        };
    }
}

export default useGetProfileByUserId