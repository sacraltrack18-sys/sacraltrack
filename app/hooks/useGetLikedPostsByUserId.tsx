import { database, Query } from "@/libs/AppWriteClient"

const useGetLikedPostsByUserId = async (userId: string) => {
    try {
        console.log('Fetching likes for user:', userId);
        
        const likesResponse = await database.listDocuments(
            String(process.env.NEXT_PUBLIC_DATABASE_ID), 
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_LIKE), 
            [ 
                Query.equal('user_id', userId) 
            ]
        );
        
        console.log('Likes response:', likesResponse);

        if (!likesResponse.documents.length) {
            console.log('No likes found');
            return [];
        }

        const postIds = likesResponse.documents.map(like => like.post_id);
        console.log('Post IDs:', postIds);

        const postsResponse = await database.listDocuments(
            String(process.env.NEXT_PUBLIC_DATABASE_ID),
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_POST),
            [Query.equal('$id', postIds)]
        );

        const postsWithProfiles = await Promise.all(
            postsResponse.documents.map(async (post) => {
                const profileResponse = await database.listDocuments(
                    String(process.env.NEXT_PUBLIC_DATABASE_ID),
                    String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
                    [Query.equal('user_id', post.user_id)]
                );

                return {
                    ...post,
                    profile: profileResponse.documents[0]
                };
            })
        );

        return postsWithProfiles;
    } catch (error) {
        console.error('Error in useGetLikedPostsByUserId:', error);
        throw error;
    }
}

export default useGetLikedPostsByUserId; 