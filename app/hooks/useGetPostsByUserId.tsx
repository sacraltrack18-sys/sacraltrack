import { database, Query } from "@/libs/AppWriteClient";

const useGetPostsByUser = async (userId: string) => {
    try {
        const response = await database.listDocuments(
            String(process.env.NEXT_PUBLIC_DATABASE_ID),
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_POST),
            [
                Query.equal("user_id", userId),
                Query.orderDesc("$id"),
            ]
        );
        const documents = response.documents;

        const result = documents.map(doc => {
            return {
                id: doc?.$id,
                user_id: doc?.user_id,
                audio_url: doc?.audio_url || null, // Используем null, если нет значения
                mp3_url: doc?.mp3_url || null,
                trackname: doc?.trackname || null,
                image_url: doc?.image_url || null,
                text: doc?.text || null,
                created_at: doc?.created_at || null,
                price: doc?.price || null,
                genre: doc?.genre || null,
                segments: doc?.segments || null,
                m3u8_url: doc?.m3u8_url || null,
                streaming_urls: doc?.streaming_urls || [], // Предположим, это массив URL-адресов
            };
        });

        return result;
    } catch (error) {
        console.error("Failed to get posts by user:", error);
        throw error;
    }
};

export default useGetPostsByUser;
