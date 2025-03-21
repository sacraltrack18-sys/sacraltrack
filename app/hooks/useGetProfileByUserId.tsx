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
                image: '/images/placeholder-avatar.svg',
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
                image: '/images/placeholder-avatar.svg',
                bio: ''
            };
        }

        return {
            id: documents[0]?.$id,
            user_id: documents[0]?.user_id,
            name: documents[0]?.name || 'Unknown User',
            image: documents[0]?.image || '/images/placeholder-avatar.svg',
            bio: documents[0]?.bio || ''
        };
    } catch (error) {
        console.error(`[DEBUG-HOOK] Error fetching profile for user ID ${userId}:`, error);
        // Return default profile instead of throwing error
        return {
            id: null,
            user_id: userId,
            name: 'Unknown User',
            image: '/images/placeholder-avatar.svg',
            bio: ''
        };
    }
}

export default useGetProfileByUserId