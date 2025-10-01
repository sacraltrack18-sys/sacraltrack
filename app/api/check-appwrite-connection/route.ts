import { NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';
import { APPWRITE_CONFIG } from '@/libs/AppWriteClient';

// Simple API endpoint to test Appwrite connection
export async function GET() {
  try {
    console.log('[check-appwrite-connection] Testing Appwrite connection...');
    console.log('[check-appwrite-connection] Configuration:', {
      endpoint: APPWRITE_CONFIG.endpoint,
      projectId: APPWRITE_CONFIG.projectId,
      databaseId: APPWRITE_CONFIG.databaseId,
      statisticsCollectionId: APPWRITE_CONFIG.statisticsCollectionId,
    });
    
    // Create a new client for server-side operations
    const client = new Client()
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId);
    
    // Check if we're using server side (no API key needed for client side)
    const isServerSide = typeof window === 'undefined';
    console.log('[check-appwrite-connection] Running on server side:', isServerSide);
    
    // Initialize databases service (client-side compatible)
    const databases = new Databases(client);
    
    try {
      // For server-side operations without API key, try a simple collection list
      // This is limited but should work for testing connectivity
      const collections = await databases.listCollections(
        APPWRITE_CONFIG.databaseId
      );
      
      // Check if the statistics collection exists
      const statisticsCollectionExists = collections.total > 0 && 
        collections.collections.some(collection => 
          collection.$id === APPWRITE_CONFIG.statisticsCollectionId
        );
      
      console.log('[check-appwrite-connection] Collections count:', collections.total);
      console.log('[check-appwrite-connection] Statistics collection exists:', statisticsCollectionExists);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Appwrite connection successful',
        collections: collections.total,
        statisticsCollection: {
          exists: statisticsCollectionExists,
          id: APPWRITE_CONFIG.statisticsCollectionId
        },
        config: {
          environment: process.env.NODE_ENV,
          endpoint: APPWRITE_CONFIG.endpoint,
          projectId: APPWRITE_CONFIG.projectId,
          databaseId: APPWRITE_CONFIG.databaseId,
          trackCollectionId: APPWRITE_CONFIG.trackCollectionId,
          statisticsCollectionId: APPWRITE_CONFIG.statisticsCollectionId
        }
      });
    } catch (listError) {
      console.error('[check-appwrite-connection] Error listing collections:', listError);
      
      // Try a more specific approach - get documents from the track collection
      // This is more likely to work with client-side permissions
      try {
        const documents = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.trackCollectionId,
          [/* No queries to get all docs */]
        );
        
        console.log('[check-appwrite-connection] Successfully retrieved track documents:',
          documents.total);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Appwrite connection successful via track collection',
          documents: documents.total,
          config: {
            environment: process.env.NODE_ENV,
            endpoint: APPWRITE_CONFIG.endpoint,
            projectId: APPWRITE_CONFIG.projectId,
            databaseId: APPWRITE_CONFIG.databaseId,
            trackCollectionId: APPWRITE_CONFIG.trackCollectionId,
            statisticsCollectionId: APPWRITE_CONFIG.statisticsCollectionId
          }
        });
      } catch (docError) {
        console.error('[check-appwrite-connection] Error getting track documents:', docError);
        throw docError; // Pass to outer catch block
      }
    }
  } catch (error: any) {
    console.error('[check-appwrite-connection] Error testing Appwrite connection:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to connect to Appwrite',
      details: error.message || String(error),
      config: {
        environment: process.env.NODE_ENV,
        endpoint: APPWRITE_CONFIG.endpoint,
        projectId: APPWRITE_CONFIG.projectId,
        databaseId: APPWRITE_CONFIG.databaseId,
        trackCollectionId: APPWRITE_CONFIG.trackCollectionId,
        statisticsCollectionId: APPWRITE_CONFIG.statisticsCollectionId,
        envKeys: {
          NEXT_PUBLIC_COLLECTION_ID_TRACK_STATISTICS: process.env.NEXT_PUBLIC_COLLECTION_ID_TRACK_STATISTICS
        }
      }
    }, { status: 500 });
  }
} 