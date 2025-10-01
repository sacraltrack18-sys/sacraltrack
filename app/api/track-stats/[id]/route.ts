import { NextResponse } from 'next/server';
import { database } from "@/libs/AppWriteClient";
import { APPWRITE_CONFIG } from "@/libs/AppWriteClient";

// API route for track statistics
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the track ID from params (now properly typed as a Promise)
    const { id } = await params;
    const trackId = id;
    
    if (!trackId) {
      console.error('[track-stats API] Missing track ID');
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }
    
    // Log collection ID for debugging
    console.log(`[track-stats API] Using stats collection ID: ${APPWRITE_CONFIG.statisticsCollectionId}`);
    console.log(`[track-stats API] Using track collection ID: ${APPWRITE_CONFIG.trackCollectionId}`);
    console.log(`[track-stats API] Fetching stats for track ID: ${trackId}`);
    
    // Verify track exists first using client-side permissions
    let trackExists = false;
    try {
      const track = await database.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.trackCollectionId,
        trackId
      );
      trackExists = !!track;
      console.log(`[track-stats API] Track found: ${trackExists}`);
    } catch (trackError) {
      console.warn(`[track-stats API] Could not verify track: ${trackError}`);
      // Continue anyway as this is just a verification step
    }
    
    // Get track statistics using client-side permissions
    try {
      const stats = await database.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.statisticsCollectionId,
        trackId
      );
      
      console.log(`[track-stats API] Successfully fetched stats for track ID: ${trackId}`);
      return NextResponse.json({ 
        success: true, 
        statistics: stats 
      });
      
    } catch (error: any) {
      console.error(`[track-stats API] Error fetching track statistics: ${error.message || error}`, error);
      
      // If document not found, create new statistics document
      if (error.code === 404) {
        console.log(`[track-stats API] Track statistics not found, creating new document for track ID: ${trackId}`);
        
        // Create statistics document with track ID as document ID
        const statsData = {
          track_id: trackId,
          plays_count: "0",
          downloads_count: "0",
          purchases_count: "0",
          likes: "0",
          shares: "0",
          unique_listeners: "0",
          last_played: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        try {
          // Use client-side compatible approach to create document
          const newStats = await database.createDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.statisticsCollectionId,
            trackId, // Use track ID as document ID
            statsData
          );
          
          console.log(`[track-stats API] Created new stats document with ID: ${newStats.$id}`);
          return NextResponse.json({ 
            success: true, 
            statistics: newStats,
            message: 'Created new statistics document'
          });
        } catch (createError: any) {
          console.error(`[track-stats API] Error creating statistics document: ${createError.message || createError}`, createError);
          
          // If we can't create the document, return dummy statistics to prevent client errors
          return NextResponse.json({ 
            success: true, 
            statistics: {
              ...statsData,
              $id: trackId,
              $createdAt: new Date().toISOString(),
              $updatedAt: new Date().toISOString(),
            },
            message: 'Using fallback statistics due to creation error'
          });
        }
      }
      
      // For any other error, return fallback statistics to prevent client errors
      return NextResponse.json({ 
        success: true, 
        statistics: {
          $id: trackId,
          track_id: trackId,
          plays_count: "0",
          downloads_count: "0",
          purchases_count: "0",
          likes: "0",
          shares: "0",
          unique_listeners: "0",
          last_played: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
        },
        message: 'Using fallback statistics due to fetch error'
      });
    }
    
  } catch (error: any) {
    console.error(`[track-stats API] Unhandled error: ${error.message || error}`, error);
    
    // Return fallback statistics to prevent client errors
    return NextResponse.json({ 
      success: true, 
      statistics: {
        $id: "fallback",
        track_id: params ? (await params).id : "unknown",
        plays_count: "0",
        downloads_count: "0", 
        purchases_count: "0",
        likes: "0",
        shares: "0",
        unique_listeners: "0",
        last_played: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
      },
      error: error.message || 'Unhandled server error',
      message: 'Using fallback statistics due to server error'
    });
  }
} 