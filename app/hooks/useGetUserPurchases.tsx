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

      const purchases = response.documents; // Assuming this is of type Document[]

      // Map to create an array of Purchase
      const purchaseData: Purchase[] = purchases.map(doc => ({
        $id: doc.$id, // Ensure to include the $id property
        user_id: doc.user_id, // Ensure these properties exist in Document
        track_id: doc.track_id,
        author_id: doc.author_id,
        purchase_date: doc.purchase_date,
        amount: doc.amount,
        // Add any other properties as needed
      }));

      return purchaseData; // Now this is of type Purchase[]
    } catch (error) {
      console.error('Error getting user purchases:', error);
      return [];
    }
  };

  return { getUserPurchases };
};

export default useGetUserPurchases; 