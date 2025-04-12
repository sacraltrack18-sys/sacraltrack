"use client";

import { useState, useEffect } from 'react';
import { database } from '@/libs/AppWriteClient';
import { APPWRITE_CONFIG } from '@/libs/AppWriteClient';

export interface TrackStatistics {
  plays_count: number;
  downloads_count: number;
  purchases_count: number;
  unique_listeners: number;
  geographic_data: {
    [country: string]: number;
  };
  age_groups: {
    [group: string]: number;
  };
  gender_distribution: {
    [gender: string]: number;
  };
  device_types: {
    [type: string]: number;
  };
}

const useTrackStatistics = (trackId: string) => {
  const [statistics, setStatistics] = useState<TrackStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!trackId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch track statistics
        const statsDoc = await database.getDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.statisticsCollectionId,
          trackId
        );

        // Fetch today's analytics
        const today = new Date().toISOString().split('T')[0];
        const analyticsId = `${trackId}_${today}`;

        let analyticsDoc;
        try {
          analyticsDoc = await database.getDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.analyticsCollectionId,
            analyticsId
          );
        } catch (error) {
          // If no analytics exist for today, create a new document
          analyticsDoc = await database.createDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.analyticsCollectionId,
            analyticsId,
            {
              track_id: trackId,
              date: today,
              unique_listeners: 0,
              geographic_data: {},
              age_groups: {},
              gender_distribution: {},
              device_types: {}
            }
          );
        }

        setStatistics({
          plays_count: statsDoc.plays_count || 0,
          downloads_count: statsDoc.downloads_count || 0,
          purchases_count: statsDoc.purchases_count || 0,
          unique_listeners: analyticsDoc.unique_listeners || 0,
          geographic_data: analyticsDoc.geographic_data || {},
          age_groups: analyticsDoc.age_groups || {},
          gender_distribution: analyticsDoc.gender_distribution || {},
          device_types: analyticsDoc.device_types || {}
        });

      } catch (error) {
        console.error('Error fetching track statistics:', error);
        setError(error instanceof Error ? error : new Error('Failed to fetch track statistics'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [trackId]);

  return {
    statistics,
    isLoading,
    error
  };
};

export default useTrackStatistics; 