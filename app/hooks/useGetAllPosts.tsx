import { database, Query } from "@/libs/AppWriteClient";
import useGetProfileByUserId from "./useGetProfileByUserId";

const useGetAllPosts = async () => {
    try {
        const response = await database.listDocuments(
            String(process.env.NEXT_PUBLIC_DATABASE_ID), 
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_POST), 
            [ Query.orderDesc("$id") ]
        );
        const documents = response.documents;

        const objPromises = documents.map(async doc => {
            // Получаем профиль автора поста по user_id
            let profile = await useGetProfileByUserId(doc?.user_id);

            return {
                id: doc?.$id,
                user_id: doc?.user_id,
                audio_url: doc?.audio_url || null, // Обеспечиваем наличие значения
                mp3_url: doc?.mp3_url || null,
                m3u8_url: doc?.m3u8_url || null,
                image_url: doc?.image_url || null,
                trackname: doc?.trackname || null,
                text: doc?.text || null,
                created_at: doc?.created_at || null,
                price: doc?.price || null,
                genre: doc?.genre || null,
                segments: doc?.segments || null,
                streaming_urls: doc?.streaming_urls || [], // Предполагаем, что это массив
                profile: {
                    user_id: profile ? profile.user_id : null,
                    name: profile ? profile.name : null,
                    image: profile ? profile.image : null,
                }
            };
        });

        const result = await Promise.all(objPromises);
        return result;
    } catch (error) {
        console.error("Error fetching posts:", error);
        throw error;
    }
}

export default useGetAllPosts;
