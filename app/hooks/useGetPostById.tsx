import { database } from "@/libs/AppWriteClient"
import useGetProfileByUserId from "./useGetProfileByUserId";

const useGetPostById = async (id: string) => {
    try {
        const post = await database.getDocument(
            String(process.env.NEXT_PUBLIC_DATABASE_ID), 
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_POST), 
            id
        );

        const profile = await useGetProfileByUserId(post?.user_id);

        return {
            id: post?.$id, 
            user_id: post?.user_id,
            text: post?.text,
            created_at: post?.created_at,
            audio_url: post?.audio_url,
            trackname: post?.trackname,
            image_url: post?.image_url,
            price: post?.price,
            genre: post?.genre,
            mp3_url: post?.mp3_url,
            segments: post?.segments, // Предполагается, что segments также строка
            m3u8_url: post?.m3u8_url, // URL для HLS стриминга
            streaming_urls: post?.streaming_urls, // Массив или строка URL-ов для потокового воспроизведения
            profile: {
                user_id: profile?.user_id,  
                name: profile?.name,
                image: profile?.image,
            }
        } 
    } catch (error) {
        throw error;
    }
}

export default useGetPostById;
