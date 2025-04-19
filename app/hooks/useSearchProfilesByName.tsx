import { database, Query } from "@/libs/AppWriteClient"

const useSearchProfilesByName = async (name: string) => {
    try {
        // Normalize the search term - trim whitespace
        const searchTerm = name.trim();
        
        if (!searchTerm) return [];
        
        const profileResult = await database.listDocuments(
            String(process.env.NEXT_PUBLIC_DATABASE_ID), 
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE), 
            [ 
                Query.limit(10), // Увеличиваем лимит для большего количества совпадений
                Query.search("name", searchTerm)
            ]
        );

       const objPromises = profileResult.documents.map(profile => {
            return {
                id: profile?.user_id,  
                name: profile?.name,
                image: profile?.image,
            }
        })

        const result = await Promise.all(objPromises)
        return result
    } catch (error) {
        console.log("Error searching profiles:", error)
        return [] // Возвращаем пустой массив вместо undefined
    }
}

export default useSearchProfilesByName