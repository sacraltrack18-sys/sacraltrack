import { database } from "@/libs/AppWriteClient"

const useUpdateProfileImage = async (id: string, image: string) => {
    try {
        // Extract just the file ID from the image path/URL if it's longer than 30 chars
        const imageId = image.length > 30 
            ? image.split('/').pop()?.substring(0, 30) || image.substring(0, 30)
            : image;

        await database.updateDocument(
            String(process.env.NEXT_PUBLIC_DATABASE_ID), 
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE), 
            id, 
            { 
                image: imageId 
            }
        );
    } catch (error) {
        throw error;
    }
}

export default useUpdateProfileImage