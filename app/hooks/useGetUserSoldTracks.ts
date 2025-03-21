import { useState, useEffect } from 'react';
import { database, Query } from '@/libs/AppWriteClient';
import { useUser } from '@/app/context/user';

export const useGetUserSoldTracks = () => {
  const [soldTracks, setSoldTracks] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const userContext = useUser();

  useEffect(() => {
    const fetchSoldTracks = async () => {
      if (!userContext?.user?.id) return;
      
      try {
        setIsLoading(true);
        
        const response = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PURCHASES!,
          [
            Query.equal('author_id', userContext.user.id)
          ]
        );
        
        setSoldTracks(response.total);
      } catch (error) {
        console.error('Error fetching sold tracks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSoldTracks();
  }, [userContext?.user?.id]);

  return { soldTracks, isLoading };
}; 