import { database, Query } from "@/libs/AppWriteClient";
import { Purchase } from "@/app/types";

const useGetUserPurchases = () => {
  const getUserPurchases = async (userId: string) => {
    try {
      const response = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
        [
          Query.equal('user_id', userId),
          Query.orderDesc('purchase_date')
        ]
      );
      
      return response.documents as Purchase[];
    } catch (error) {
      console.error('Error getting user purchases:', error);
      return [];
    }
  };

  return { getUserPurchases };
};

export default useGetUserPurchases; 