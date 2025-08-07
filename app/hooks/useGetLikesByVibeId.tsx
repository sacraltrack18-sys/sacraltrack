import { database, Query } from "@/libs/AppWriteClient"

const useGetLikesByVibeId = async (vibeId: string) => {
    try {
        const response = await database.listDocuments(
            String(process.env.NEXT_PUBLIC_DATABASE_ID), 
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES), 
            [ 
                Query.equal('vibe_id', vibeId) 
            ]
        );
        const documents = response.documents;
        const result = documents.map(doc => {
            return { 
                id: doc?.$id, 
                user_id: doc?.user_id,
                vibe_id: doc?.vibe_id
            }
        })
        
        return result
    } catch (error) {
        throw error
    }
}

export default useGetLikesByVibeId
