import { useState, useCallback } from "react";
import { database, ID, Query } from "@/libs/AppWriteClient";

interface PurchaseData {
  user_id: string;
  track_id: string;
  author_id: string;
  amount: string;
  session_id: string;
}

interface CreatePurchaseHook {
  isLoading: boolean;
  error: Error | null;
  createPurchase: (data: PurchaseData) => Promise<any>;
}

const useCreatePurchase = (): CreatePurchaseHook => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPurchase = useCallback(async (data: PurchaseData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if purchase with this session_id already exists
      const existingPurchases = await database.listDocuments(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES),
        [
          Query.equal('session_id', data.session_id)
        ]
      );

      // If purchase already exists, return the existing document
      if (existingPurchases.documents.length > 0) {
        console.log("Purchase already exists for this session");
        const error = new Error('Purchase already exists');
        error.name = 'DuplicatePurchaseError';
        throw error;
      }

      const purchase_date = new Date().toISOString();

      // Create new purchase document
      const document = await database.createDocument(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES),
        ID.unique(),
        {
          user_id: data.user_id,
          track_id: data.track_id,
          author_id: data.author_id,
          purchase_date,
          amount: data.amount,
          session_id: data.session_id
        }
      );

      console.log("Successfully saved purchase information:", document.$id);

      // Calculate royalty amount (50% of purchase amount)
      const royaltyAmount = (parseFloat(data.amount) / 2).toString();

      // Create royalty record
      await database.createDocument(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY),
        ID.unique(),
        {
          author_id: data.author_id,
          track_id: data.track_id,
          amount: royaltyAmount,
          transaction_date: new Date().toISOString(),
          purchase_id: document.$id,
          status: 'completed',
          user_id: data.user_id,
          purchase_amount: data.amount,
          royalty_percentage: "50",
          currency: "USD",
          payment_method: "stripe",
          stripe_session_id: data.session_id,
          metadata_json: "{}"
        }
      );

      console.log("Successfully created royalty record");

      // Update author's royalty balance
      try {
        const authorRoyaltyResponse = await database.listDocuments(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE),
          []
        );

        const existingBalance = authorRoyaltyResponse.documents.find(
          doc => doc.author_id === data.author_id
        );

        if (existingBalance) {
          // Update existing balance
          const newBalance = (parseFloat(existingBalance.balance) + parseFloat(royaltyAmount)).toString();
          const newTotalEarned = (parseFloat(existingBalance.total_earned) + parseFloat(royaltyAmount)).toString();
          
          await database.updateDocument(
            String(process.env.NEXT_PUBLIC_DATABASE_ID),
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE),
            existingBalance.$id,
            {
              balance: newBalance,
              total_earned: newTotalEarned,
              last_updated: new Date().toISOString()
            }
          );
        } else {
          // Create new balance record for author
          await database.createDocument(
            String(process.env.NEXT_PUBLIC_DATABASE_ID),
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_ROYALTY_BALANCE),
            ID.unique(),
            {
              author_id: data.author_id,
              balance: royaltyAmount,
              total_earned: royaltyAmount,
              last_updated: new Date().toISOString(),
              currency: "USD"
            }
          );
        }
      } catch (error) {
        console.error('Error updating royalty balance:', error);
      }

      // Create notifications
      await database.createDocument(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS),
        ID.unique(),
        {
          user_id: data.author_id,
          type: 'royalty',
          title: 'New Royalty Earned',
          message: `You earned $${royaltyAmount} in royalties from a track sale`,
          amount: royaltyAmount,
          track_id: data.track_id,
          created_at: new Date().toISOString(),
          read: "false"
        }
      );

      return document;
    } catch (err) {
      setError(err as Error);
      console.error("Error creating purchase record:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, createPurchase };
};

export default useCreatePurchase; 