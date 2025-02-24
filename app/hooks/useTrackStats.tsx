import { database, Query } from "@/libs/AppWriteClient";
import { Purchase } from "@/app/types";

const useTrackStats = () => {
  const getTrackStats = async (trackId: string) => {
    try {
      const purchases = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
        [Query.equal('track_id', trackId)]
      );

      return {
        totalSales: purchases.documents.length,
        totalRevenue: purchases.documents.length * 2, // $2 за трек
        lastSale: purchases.documents[0]?.purchase_date
      };
    } catch (error) {
      console.error('Error getting track stats:', error);
      return null;
    }
  };

  return { getTrackStats };
};

export default useTrackStats; 