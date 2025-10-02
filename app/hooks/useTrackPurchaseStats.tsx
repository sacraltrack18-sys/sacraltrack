import { useState, useCallback } from 'react';
import { database, Query } from '@/libs/AppWriteClient';

interface TrackPurchaseStats {
  purchases_count: number;
  downloads_count: number;
  total_revenue: number;
}

const useTrackPurchaseStats = () => {
  const [stats, setStats] = useState<TrackPurchaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchaseStats = useCallback(async (trackId: string) => {
    if (!trackId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Получаем все покупки для этого трека
      const purchasesResponse = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
        [
          Query.equal('track_id', trackId),
          Query.limit(1000) // Увеличиваем лимит для получения всех покупок
        ]
      );

      const purchases = purchasesResponse.documents;
      const purchasesCount = purchases.length;
      
      // Считаем общую выручку
      const totalRevenue = purchases.reduce((sum, purchase) => {
        return sum + parseFloat(purchase.amount || '0');
      }, 0);

      // Для downloads_count используем то же значение, что и purchases_count
      // так как каждая покупка = скачивание
      const downloadsCount = purchasesCount;

      const statsData: TrackPurchaseStats = {
        purchases_count: purchasesCount,
        downloads_count: downloadsCount,
        total_revenue: totalRevenue
      };

      setStats(statsData);
    } catch (err) {
      console.error('Error fetching purchase stats:', err);
      setError('Failed to fetch purchase statistics');
      setStats({
        purchases_count: 0,
        downloads_count: 0,
        total_revenue: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    stats,
    isLoading,
    error,
    fetchPurchaseStats
  };
};

export default useTrackPurchaseStats;
