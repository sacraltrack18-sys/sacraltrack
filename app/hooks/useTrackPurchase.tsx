import { database, ID, Query } from "@/libs/AppWriteClient";
import { Purchase } from "@/app/types";

const useTrackPurchase = () => {
  const createPurchase = async (
    userId: string, 
    trackId: string, 
    authorId: string,
    amount: number
  ) => {
    try {
      console.log('Creating purchase document with:', {
        userId,
        trackId,
        authorId,
        amount: amount.toString()
      });

      // Проверяем, не была ли уже создана такая покупка
      const existingPurchases = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
        [
          Query.equal('user_id', userId),
          Query.equal('track_id', trackId)
        ]
      );

      if (existingPurchases.documents.length > 0) {
        console.log('Purchase already exists');
        return existingPurchases.documents[0];
      }

      // Создаем запись о покупке
      const purchase = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
        ID.unique(),
        {
          user_id: userId,
          track_id: trackId,
          author_id: authorId,
          purchase_date: new Date().toISOString(),
          amount: amount.toString()
        } as Purchase
      );

      console.log('Purchase created:', purchase);

      // Создаем транзакцию роялти
      await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY!,
        ID.unique(),
        {
          author_id: authorId,
          track_id: trackId,
          amount: (amount / 2).toString(),
          transaction_date: new Date().toISOString(),
          purchase_id: purchase.$id
        }
      );

      return purchase;
    } catch (error) {
      console.error('Error creating purchase:', error);
      throw error;
    }
  };

  const checkIfPurchased = async (userId: string, trackId: string) => {
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
      console.error('Error checking purchase:', error);
      throw error;
    }
  };

  return { createPurchase, checkIfPurchased };
};

export default useTrackPurchase; 