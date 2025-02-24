import { database } from "@/libs/AppwriteClient"

const useDeleteComment = async (commentId: string) => {
    try {
        await database.deleteDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COMMENTS_COLLECTION_ID!,
            commentId
        )
        return true
    } catch (error) {
        throw error
    }
}

export default useDeleteComment 