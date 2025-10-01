import { database } from "@/libs/AppWriteClient";

interface NewsItem {
    $id: string;
    postid: string;
    img_url: string;
    name: string;
    description: string;
    author: string;
    created: string;
    likes: number;
    user_id: string;
}

const useGetNewsPostById = async (): Promise<NewsItem[] | null> => {
    console.log("Fetching news..."); // Log the start of the function
    try {
        const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
        const collectionId = String(process.env.NEXT_PUBLIC_COLLECTION_ID_NEWS);
        console.log("Database ID:", databaseId);
        console.log("Collection ID:", collectionId);

        const response = await database.listDocuments(databaseId, collectionId);
        console.log("Appwrite response:", response); // Log the raw Appwrite response

        const newsItems = response.documents.map((item: any) => {
            const newItem = { ...item, postid: item.$id };
            console.log("Mapping item:", item, "to:", newItem); // Log each item mapping
            return newItem;
        }) as NewsItem[];
        console.log("Fetched news items:", newsItems); // Log the processed news items
        return newsItems;
    } catch (error) {
        console.error("Error fetching news:", error); // Log any errors that occurred
        return null;
    }
};

export default useGetNewsPostById;
