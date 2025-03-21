import { database, Query } from "@/libs/AppWriteClient";
import { RoyaltyTransaction } from "@/app/types";

const useRoyalty = () => {
  const getAuthorRoyalties = async (authorId: string) => {
    try {
      const response = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
        [
          Query.equal('author_id', authorId),
          Query.orderDesc('transaction_date')
        ]
      );
      
      const documents = response.documents;

      const royaltyData: RoyaltyTransaction[] = documents.map(doc => ({
        author_id: doc.author_id,
        track_id: doc.track_id,
        amount: doc.amount,
        transaction_date: doc.transaction_date,
        purchase_id: doc.purchase_id,
        status: doc.status,
      }));

      return royaltyData;
    } catch (error) {
      console.error('Error getting author royalties:', error);
      return [];
    }
  };

  const getRoyaltyBalance = async (authorId: string) => {
    try {
      const royalties = await getAuthorRoyalties(authorId);
      const totalRoyalty = royalties.reduce((sum, royalty) => 
        sum + parseFloat(royalty.amount), 0
      );
      return totalRoyalty;
    } catch (error) {
      console.error('Error calculating royalty balance:', error);
      return 0;
    }
  };

  return { getAuthorRoyalties, getRoyaltyBalance };
};

export default useRoyalty; 