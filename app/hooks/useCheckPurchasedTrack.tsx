import { database, Query } from "@/libs/AppWriteClient";

const useCheckPurchasedTrack = () => {
  const checkIfTrackPurchased = async (userId: string, trackId: string) => {
    try {
      const response = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
        [
          Query.equal('user_id', userId),
          Query.equal('track_id', trackId)
        ]
      );
      
      return response.documents.length > 0;
    } catch (error) {
      console.error('Error checking purchased track:', error);
      return false;
    }
  };

  return { checkIfTrackPurchased };
};

export default useCheckPurchasedTrack; 