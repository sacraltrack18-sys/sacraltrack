import { database, ID } from "@/libs/AppWriteClient"

const useCreateVibeLike = async (userId: string, vibeId: string) => {
    try {
        await database.createDocument(
            String(process.env.NEXT_PUBLIC_DATABASE_ID), 
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES), 
            ID.unique(), 
        {
            user_id: userId,
            vibe_id: vibeId,
        });
    } catch (error) {
        throw error
    }
}

export default useCreateVibeLike
