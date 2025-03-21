"use client";

import { Client, Databases, ID } from 'appwrite';
import { APPWRITE_CONFIG } from '@/app/config/appwrite';

interface InteractionData {
  track_id: string;
  user_id: string;
  interaction_type: 'play' | 'download' | 'purchase' | 'like' | 'comment';
  geographic_info?: {
    country?: string;
    city?: string;
    region?: string;
  };
  device_info?: {
    type?: string;
    os?: string;
    browser?: string;
  };
  user_demographics?: {
    age_group?: string;
    gender?: string;
  };
}

const useTrackInteraction = () => {
  const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId);
  
  const databases = new Databases(client);

  const recordInteraction = async (data: InteractionData) => {
    try {
      // Record the interaction
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.interactionsCollectionId,
        ID.unique(),
        {
          ...data,
          created_at: new Date().toISOString()
        }
      );

      // Update track statistics
      const statsKey = `${data.interaction_type}s_count`;
      const currentStats = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.statisticsCollectionId,
        data.track_id
      );

      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.statisticsCollectionId,
        data.track_id,
        {
          [statsKey]: (currentStats[statsKey] || 0) + 1
        }
      );

      // Update analytics
      const today = new Date().toISOString().split('T')[0];
      const analyticsId = `${data.track_id}_${today}`;

      try {
        const currentAnalytics = await databases.getDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.analyticsCollectionId,
          analyticsId
        );

        // Update existing analytics document
        await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.analyticsCollectionId,
          analyticsId,
          {
            unique_listeners: (currentAnalytics.unique_listeners || 0) + 1,
            geographic_data: {
              ...currentAnalytics.geographic_data,
              [data.geographic_info?.country || 'unknown']: ((currentAnalytics.geographic_data || {})[data.geographic_info?.country || 'unknown'] || 0) + 1
            },
            age_groups: {
              ...currentAnalytics.age_groups,
              [data.user_demographics?.age_group || 'unknown']: ((currentAnalytics.age_groups || {})[data.user_demographics?.age_group || 'unknown'] || 0) + 1
            },
            gender_distribution: {
              ...currentAnalytics.gender_distribution,
              [data.user_demographics?.gender || 'unknown']: ((currentAnalytics.gender_distribution || {})[data.user_demographics?.gender || 'unknown'] || 0) + 1
            },
            device_types: {
              ...currentAnalytics.device_types,
              [data.device_info?.type || 'unknown']: ((currentAnalytics.device_types || {})[data.device_info?.type || 'unknown'] || 0) + 1
            }
          }
        );
      } catch (error) {
        // If document doesn't exist, create new one
        await databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.analyticsCollectionId,
          analyticsId,
          {
            track_id: data.track_id,
            date: today,
            unique_listeners: 1,
            geographic_data: { [data.geographic_info?.country || 'unknown']: 1 },
            age_groups: { [data.user_demographics?.age_group || 'unknown']: 1 },
            gender_distribution: { [data.user_demographics?.gender || 'unknown']: 1 },
            device_types: { [data.device_info?.type || 'unknown']: 1 }
          }
        );
      }

    } catch (error) {
      console.error('Error recording track interaction:', error);
      throw error;
    }
  };

  const getUserDeviceInfo = () => {
    if (typeof window === 'undefined') return {};

    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet/i.test(ua)) deviceType = 'tablet';

    return {
      type: deviceType,
      os: navigator.platform,
      browser: navigator.userAgent.split(' ').pop()
    };
  };

  const getGeographicInfo = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return {
        country: data.country_name,
        city: data.city,
        region: data.region
      };
    } catch (error) {
      console.error('Error fetching geographic info:', error);
      return {};
    }
  };

  return {
    recordInteraction,
    getUserDeviceInfo,
    getGeographicInfo
  };
};

export default useTrackInteraction; 